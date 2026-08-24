import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Clipping, ClippingType } from "../core/kindle-clippings.js";
import type {
  ClippingsRepository,
  SearchOptions,
  SearchResult,
  StoredClipping,
} from "../use-cases/types.js";

export type {
  StoredClipping,
  SearchOptions,
  SearchResult,
} from "../use-cases/types.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clippings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT,
    page INTEGER,
    location_start INTEGER NOT NULL,
    location_end INTEGER,
    added_at TEXT,
    added_at_raw TEXT NOT NULL,
    content TEXT
  );
`;

export function openClippingsStore(location: string): DatabaseSync {
  if (location !== ":memory:")
    mkdirSync(dirname(location), { recursive: true });
  const db = new DatabaseSync(location);
  db.exec(SCHEMA);
  return db;
}

export function insertClippings(
  db: DatabaseSync,
  clippings: readonly Clipping[],
): void {
  const stmt = db.prepare(
    `INSERT INTO clippings
      (type, title, author, page, location_start, location_end, added_at, added_at_raw, content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  // Without an explicit transaction, SQLite auto-commits each insert
  // individually, which is fine for a handful of rows but far too slow for
  // bulk seeding (thousands of separate commits).
  db.exec("BEGIN");
  try {
    for (const clipping of clippings) {
      stmt.run(
        clipping.type,
        clipping.title,
        clipping.author,
        clipping.page,
        clipping.locationStart,
        clipping.locationEnd,
        clipping.addedAt === null ? null : clipping.addedAt.toISOString(),
        clipping.addedAtRaw,
        clipping.content,
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const DEFAULT_SEARCH_LIMIT = 50;

// Sentinels for "unparseable-date rows always sort last, regardless of
// direction": substituting them via COALESCE keeps the ORDER BY and the
// cursor's row-value comparison in a single consistent direction, so SQLite's
// native tuple comparison (a, b) < (x, y) can be used as-is instead of having
// to hand-write mixed-direction OR logic.
const NULL_SENTINEL_DESC = ""; // sorts before every real ISO date string
const NULL_SENTINEL_ASC = "9999-12-31T23:59:59.999Z"; // sorts after every real ISO date string

interface Cursor {
  sortKey: string;
  id: number;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

function decodeCursor(token: string): Cursor {
  return JSON.parse(
    Buffer.from(token, "base64url").toString("utf-8"),
  ) as Cursor;
}

function escapeLikePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function searchClippings(
  db: DatabaseSync,
  options: SearchOptions = {},
): SearchResult {
  const direction = options.sortDirection === "asc" ? "ASC" : "DESC";
  const nullSentinel =
    direction === "ASC" ? NULL_SENTINEL_ASC : NULL_SENTINEL_DESC;
  const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;

  const conditions: string[] = [];
  const params: Record<string, string | number> = {
    $sentinel: nullSentinel,
    $limit: limit + 1, // fetch one extra row to know whether a next page exists
  };

  if (options.query !== undefined && options.query.length > 0) {
    const pattern = `%${escapeLikePattern(options.query)}%`;
    conditions.push(
      "(title LIKE $pattern ESCAPE '\\' OR author LIKE $pattern ESCAPE '\\' OR content LIKE $pattern ESCAPE '\\')",
    );
    params["$pattern"] = pattern;
  }

  if (options.cursor !== undefined && options.cursor !== null) {
    const cursor = decodeCursor(options.cursor);
    const comparator = direction === "ASC" ? ">" : "<";
    conditions.push(
      `(COALESCE(added_at, $sentinel), id) ${comparator} ($cursorSortKey, $cursorId)`,
    );
    params["$cursorSortKey"] = cursor.sortKey;
    params["$cursorId"] = cursor.id;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      id, type, title, author, page,
      location_start AS locationStart,
      location_end AS locationEnd,
      added_at AS addedAt,
      added_at_raw AS addedAtRaw,
      content,
      COALESCE(added_at, $sentinel) AS sortKey
    FROM clippings
    ${whereClause}
    ORDER BY sortKey ${direction}, id ${direction}
    LIMIT $limit
  `;

  const rows = db.prepare(sql).all(params) as unknown as (ClippingRow & {
    sortKey: string;
  })[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  const nextCursor =
    hasMore && lastRow !== undefined
      ? encodeCursor({ sortKey: lastRow.sortKey, id: lastRow.id })
      : null;

  return {
    clippings: pageRows.map((row) => rowToStoredClipping(row)),
    nextCursor,
  };
}

interface ClippingRow {
  id: number;
  type: string;
  title: string;
  author: string | null;
  page: number | null;
  locationStart: number;
  locationEnd: number | null;
  addedAt: string | null;
  addedAtRaw: string;
  content: string | null;
}

function rowToStoredClipping(row: ClippingRow): StoredClipping {
  const base = {
    id: row.id,
    title: row.title,
    author: row.author,
    page: row.page,
    locationStart: row.locationStart,
    locationEnd: row.locationEnd,
    addedAt: row.addedAt === null ? null : new Date(row.addedAt),
    addedAtRaw: row.addedAtRaw,
  };

  const type = row.type as ClippingType;
  switch (type) {
    case "bookmark":
      return { ...base, type: "bookmark", content: null };
    case "highlight":
      return { ...base, type: "highlight", content: row.content as string };
    case "note":
      return { ...base, type: "note", content: row.content as string };
  }
}

export function createSqliteClippingsRepository(
  db: DatabaseSync,
): ClippingsRepository {
  return {
    insert: (clippings) => insertClippings(db, clippings),
    search: (options) => searchClippings(db, options),
  };
}
