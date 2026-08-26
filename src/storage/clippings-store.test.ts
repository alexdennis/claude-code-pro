import { describe, expect, it } from "vitest";
import {
  insertClippings,
  openClippingsStore,
  searchClippings,
} from "./clippings-store.js";
import type { Bookmark, Highlight, Note } from "../core/kindle-clippings.js";

const highlight: Highlight = {
  type: "highlight",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: 12,
  location: { start: 200, end: 202 },
  addedAt: new Date("2026-08-12T15:15:00.000Z"),
  addedAtRaw: "Wednesday, August 12, 2026 3:15:00 PM",
  content: "You have power over your mind, not outside events.",
};

const note: Note = {
  type: "note",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: 12,
  location: { start: 202, end: null },
  addedAt: new Date("2026-08-12T15:16:00.000Z"),
  addedAtRaw: "Wednesday, August 12, 2026 3:16:00 PM",
  content: "Reread this before reacting to anything today.",
};

const bookmark: Bookmark = {
  type: "bookmark",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: null,
  location: { start: 450, end: null },
  addedAt: null,
  addedAtRaw: "unparseable date",
  content: null,
};

describe("clippings-store", () => {
  it("round-trips a highlight, note, and bookmark with distinct ids, sorted by addedAt ascending", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [highlight, note, bookmark]);

    const { clippings: stored } = searchClippings(db, { sortDirection: "asc" });
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

    const {
      clippings: [stored],
    } = searchClippings(db);
    expect(stored?.addedAt).toBeNull();
    expect(stored?.addedAtRaw).toBe("unparseable date");
  });

  it("does not deduplicate identical clippings, matching parser behavior", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [highlight, highlight]);

    const { clippings: stored } = searchClippings(db);
    expect(stored).toHaveLength(2);
    expect(stored[0]?.id).not.toBe(stored[1]?.id);
  });

  it("returns an empty array from a freshly opened store", () => {
    const db = openClippingsStore(":memory:");
    expect(searchClippings(db).clippings).toEqual([]);
  });
});

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    type: "highlight",
    title: "Untitled",
    author: null,
    page: null,
    location: { start: 1, end: null },
    addedAt: new Date("2026-01-01T00:00:00.000Z"),
    addedAtRaw: "irrelevant",
    content: "filler content",
    ...overrides,
  };
}

describe("searchClippings", () => {
  it("matches a query against title, author, or content independently, case-insensitively", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ title: "Zebra Stripes", content: "no match here" }),
      makeHighlight({
        title: "Something",
        author: "Zebra Watcher",
        content: "no match here",
      }),
      makeHighlight({
        title: "Something else",
        content: "loves zebras deeply",
      }),
      makeHighlight({ title: "Irrelevant", content: "nothing to see" }),
    ]);

    const { clippings } = searchClippings(db, { query: "zebra" });
    expect(clippings.map((c) => c.title).sort()).toEqual([
      "Something",
      "Something else",
      "Zebra Stripes",
    ]);
  });

  it("matches a bookmark via title even though its content is always null", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [{ ...bookmark, title: "Findable Bookmark Title" }]);

    const { clippings } = searchClippings(db, { query: "findable" });
    expect(clippings).toHaveLength(1);
  });

  it("returns no matches and a null cursor for a query that matches nothing", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [makeHighlight({ title: "Nothing relevant" })]);

    const result = searchClippings(db, { query: "zzz-no-match-zzz" });
    expect(result.clippings).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("treats a literal % in the query as a literal character, not a SQL wildcard", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ title: "Sale", content: "Get 50% off today" }),
      makeHighlight({ title: "Inventory", content: "50 items sold today" }),
    ]);

    const { clippings } = searchClippings(db, { query: "50%" });
    expect(clippings.map((c) => c.title)).toEqual(["Sale"]);
  });

  it("treats a literal _ in the query as a literal character, not a SQL wildcard", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ title: "Exact", content: "value is a_b exactly" }),
      makeHighlight({
        title: "SingleCharDiffers",
        content: "value is aXb here",
      }),
    ]);

    const { clippings } = searchClippings(db, { query: "a_b" });
    expect(clippings.map((c) => c.title)).toEqual(["Exact"]);
  });

  it("sorts by addedAt descending by default (most recent first)", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({
        title: "Oldest",
        addedAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "Newest",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "Middle",
        addedAt: new Date("2023-01-01T00:00:00.000Z"),
      }),
    ]);

    const { clippings } = searchClippings(db);
    expect(clippings.map((c) => c.title)).toEqual([
      "Newest",
      "Middle",
      "Oldest",
    ]);
  });

  it("sorts by addedAt ascending when requested (oldest first)", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({
        title: "Oldest",
        addedAt: new Date("2020-01-01T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "Newest",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "Middle",
        addedAt: new Date("2023-01-01T00:00:00.000Z"),
      }),
    ]);

    const { clippings } = searchClippings(db, { sortDirection: "asc" });
    expect(clippings.map((c) => c.title)).toEqual([
      "Oldest",
      "Middle",
      "Newest",
    ]);
  });

  it("sorts entries with an unparseable date last, regardless of sort direction", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({
        title: "Dated",
        addedAt: new Date("2023-01-01T00:00:00.000Z"),
      }),
      { ...bookmark, title: "Undated" },
    ]);

    const desc = searchClippings(db, { sortDirection: "desc" });
    expect(desc.clippings.map((c) => c.title)).toEqual(["Dated", "Undated"]);

    const asc = searchClippings(db, { sortDirection: "asc" });
    expect(asc.clippings.map((c) => c.title)).toEqual(["Dated", "Undated"]);
  });

  it("paginates via cursor without skipping or duplicating rows", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({
        title: "A",
        addedAt: new Date("2026-01-03T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "B",
        addedAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
      makeHighlight({
        title: "C",
        addedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]);

    const page1 = searchClippings(db, { limit: 1 });
    expect(page1.clippings.map((c) => c.title)).toEqual(["A"]);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = searchClippings(db, { limit: 1, cursor: page1.nextCursor });
    expect(page2.clippings.map((c) => c.title)).toEqual(["B"]);
    expect(page2.nextCursor).not.toBeNull();

    const page3 = searchClippings(db, { limit: 1, cursor: page2.nextCursor });
    expect(page3.clippings.map((c) => c.title)).toEqual(["C"]);
    expect(page3.nextCursor).toBeNull();
  });

  it("returns a null nextCursor when all results fit within the limit", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [makeHighlight({ title: "Only one" })]);

    const result = searchClippings(db);
    expect(result.nextCursor).toBeNull();
  });

  it("returns everything, unfiltered, when no query is given", () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ title: "One" }),
      makeHighlight({ title: "Two" }),
    ]);

    const result = searchClippings(db);
    expect(result.clippings).toHaveLength(2);
  });
});
