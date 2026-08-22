import { describe, expect, it } from "vitest";
import {
  insertClippings,
  listClippings,
  openClippingsStore,
} from "./clippings-store.js";
import type { Bookmark, Highlight, Note } from "../core/kindle-clippings.js";

const highlight: Highlight = {
  type: "highlight",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: 12,
  locationStart: 200,
  locationEnd: 202,
  addedAt: new Date("2026-08-12T15:15:00.000Z"),
  addedAtRaw: "Wednesday, August 12, 2026 3:15:00 PM",
  content: "You have power over your mind, not outside events.",
};

const note: Note = {
  type: "note",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: 12,
  locationStart: 202,
  locationEnd: null,
  addedAt: new Date("2026-08-12T15:16:00.000Z"),
  addedAtRaw: "Wednesday, August 12, 2026 3:16:00 PM",
  content: "Reread this before reacting to anything today.",
};

const bookmark: Bookmark = {
  type: "bookmark",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: null,
  locationStart: 450,
  locationEnd: null,
  addedAt: null,
  addedAtRaw: "unparseable date",
  content: null,
};

describe("clippings-store", () => {
  it("round-trips a highlight, note, and bookmark with distinct ids in insertion order", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [highlight, note, bookmark]);

    const stored = listClippings(db);
    expect(stored).toHaveLength(3);

    expect(stored[0]).toMatchObject(highlight);
    expect(stored[1]).toMatchObject(note);
    expect(stored[2]).toMatchObject(bookmark);

    const ids = stored.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it("preserves addedAt: null through a round trip, distinct from a valid date", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [bookmark]);

    const [stored] = listClippings(db);
    expect(stored?.addedAt).toBeNull();
    expect(stored?.addedAtRaw).toBe("unparseable date");
  });

  it("does not deduplicate identical clippings, matching parser behavior", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [highlight, highlight]);

    const stored = listClippings(db);
    expect(stored).toHaveLength(2);
    expect(stored[0]?.id).not.toBe(stored[1]?.id);
  });

  it("returns an empty array from a freshly opened store", () => {
    const db = openClippingsStore(":memory:");
    expect(listClippings(db)).toEqual([]);
  });
});
