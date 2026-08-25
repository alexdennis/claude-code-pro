import { DatabaseSync } from "node:sqlite";
import type { StoredClipping } from "../use-cases/types.js";

export interface TagsRepository {
  addTag(clippingId: number, tag: string): void;
  removeTag(clippingId: number, tag: string): void;
  listClippingsByTag(tag: string): StoredClipping[];
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS clipping_tags (
    clipping_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (clipping_id, tag)
  );
`;

export function openTagsStore(db: DatabaseSync): void {
  db.exec(SCHEMA);
}

export function addTag(
  db: DatabaseSync,
  clippingId: number,
  tag: string,
): void {
  db.prepare(
    `INSERT OR IGNORE INTO clipping_tags (clipping_id, tag) VALUES (?, ?)`,
  ).run(clippingId, tag);
}

export function removeTag(
  db: DatabaseSync,
  clippingId: number,
  tag: string,
): void {
  db.prepare(`DELETE FROM clipping_tags WHERE clipping_id = ? AND tag = ?`).run(
    clippingId,
    tag,
  );
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

  switch (row.type) {
    case "bookmark":
      return { ...base, type: "bookmark", content: null };
    case "highlight":
      return { ...base, type: "highlight", content: row.content as string };
    case "note":
      return { ...base, type: "note", content: row.content as string };
    default:
      // Existing rows are always written by clippings-store, which only ever
      // writes one of the three known types.
      throw new Error(`unknown clipping type: ${row.type}`);
  }
}

export function listClippingsByTag(
  db: DatabaseSync,
  tag: string,
): StoredClipping[] {
  const rows = db
    .prepare(
      `SELECT
        c.id, c.type, c.title, c.author, c.page,
        c.location_start AS locationStart,
        c.location_end AS locationEnd,
        c.added_at AS addedAt,
        c.added_at_raw AS addedAtRaw,
        c.content
       FROM clippings c
       JOIN clipping_tags t ON t.clipping_id = c.id
       WHERE t.tag = ?
       ORDER BY c.id ASC`,
    )
    .all(tag) as unknown as ClippingRow[];

  return rows.map(rowToStoredClipping);
}

export function createSqliteTagsRepository(db: DatabaseSync): TagsRepository {
  openTagsStore(db);
  return {
    addTag: (clippingId, tag) => addTag(db, clippingId, tag),
    removeTag: (clippingId, tag) => removeTag(db, clippingId, tag),
    listClippingsByTag: (tag) => listClippingsByTag(db, tag),
  };
}
