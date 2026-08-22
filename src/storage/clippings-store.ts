import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Clipping, ClippingType } from "../core/kindle-clippings.js";

export type StoredClipping = Clipping & { id: number };

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
}

export function listClippings(db: DatabaseSync): StoredClipping[] {
  const rows = db
    .prepare(
      `SELECT
      id,
      type,
      title,
      author,
      page,
      location_start AS locationStart,
      location_end AS locationEnd,
      added_at AS addedAt,
      added_at_raw AS addedAtRaw,
      content
    FROM clippings
    ORDER BY id`,
    )
    .all();

  // node:sqlite types rows as a generic string-keyed record; narrow to our known shape.
  return rows.map((row) => rowToStoredClipping(row as unknown as ClippingRow));
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
