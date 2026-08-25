import { describe, expect, it } from "vitest";
import { insertClippings, openClippingsStore } from "./clippings-store.js";
import { createSqliteClippingsStatsRepository } from "./clippings-stats-store.js";
import type { Bookmark, Highlight, Note } from "../core/kindle-clippings.js";

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    type: "highlight",
    title: "Meditations",
    author: "Marcus Aurelius",
    page: 12,
    locationStart: 200,
    locationEnd: 202,
    addedAt: new Date("2026-08-12T15:15:00.000Z"),
    addedAtRaw: "Wednesday, August 12, 2026 3:15:00 PM",
    content: "You have power over your mind, not outside events.",
    ...overrides,
  };
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    type: "note",
    title: "Meditations",
    author: "Marcus Aurelius",
    page: 12,
    locationStart: 202,
    locationEnd: null,
    addedAt: new Date("2026-08-12T15:16:00.000Z"),
    addedAtRaw: "Wednesday, August 12, 2026 3:16:00 PM",
    content: "Reread this before reacting to anything today.",
    ...overrides,
  };
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    type: "bookmark",
    title: "Meditations",
    author: "Marcus Aurelius",
    page: null,
    locationStart: 450,
    locationEnd: null,
    addedAt: null,
    addedAtRaw: "unparseable date",
    content: null,
    ...overrides,
  };
}

describe("clippings-stats-store", () => {
  it("returns all-zero stats from a freshly opened store", () => {
    const db = openClippingsStore(":memory:");
    const repo = createSqliteClippingsStatsRepository(db);

    expect(repo.stats()).toEqual({
      total: 0,
      byType: { highlight: 0, note: 0, bookmark: 0 },
      distinctAuthorCount: 0,
    });
  });

  it("counts total and per-type across a mix of clippings", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight(),
      makeHighlight(),
      makeNote(),
      makeBookmark(),
    ]);

    const repo = createSqliteClippingsStatsRepository(db);
    expect(repo.stats()).toEqual({
      total: 4,
      byType: { highlight: 2, note: 1, bookmark: 1 },
      distinctAuthorCount: 1,
    });
  });

  it("counts distinct authors, ignoring duplicates", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ author: "Marcus Aurelius" }),
      makeHighlight({ author: "Marcus Aurelius" }),
      makeHighlight({ author: "Ray Bradbury" }),
    ]);

    const repo = createSqliteClippingsStatsRepository(db);
    expect(repo.stats().distinctAuthorCount).toBe(2);
  });

  it("does not count a null author towards distinctAuthorCount", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ author: null }),
      makeHighlight({ author: null }),
      makeHighlight({ author: "Ray Bradbury" }),
    ]);

    const repo = createSqliteClippingsStatsRepository(db);
    expect(repo.stats().distinctAuthorCount).toBe(1);
  });
});
