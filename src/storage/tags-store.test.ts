import { describe, expect, it } from "vitest";
import {
  createSqliteClippingsRepository,
  openClippingsStore,
} from "./clippings-store.js";
import { createSqliteTagsRepository } from "./tags-store.js";
import type { Highlight } from "../core/kindle-clippings.js";

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    type: "highlight",
    title: "Untitled",
    author: null,
    page: null,
    locationStart: 1,
    locationEnd: null,
    addedAt: new Date("2026-01-01T00:00:00.000Z"),
    addedAtRaw: "irrelevant",
    content: "filler content",
    ...overrides,
  };
}

describe("tags-store", () => {
  it("lists no clippings for a tag before anything has been tagged", () => {
    const db = openClippingsStore(":memory:");
    const tagsRepo = createSqliteTagsRepository(db);

    expect(tagsRepo.listClippingsByTag("todo")).toEqual([]);
  });

  it("returns a tagged clipping via listClippingsByTag, joined against the clippings table", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight({ title: "Tagged One" })]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "todo");

    const tagged = tagsRepo.listClippingsByTag("todo");
    expect(tagged).toHaveLength(1);
    expect(tagged[0]).toMatchObject({ id: stored.id, title: "Tagged One" });
  });

  it("does not list a clipping under a tag it was never given", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "todo");

    expect(tagsRepo.listClippingsByTag("someday")).toEqual([]);
  });

  it("is idempotent: adding the same tag twice does not duplicate the clipping in results", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "todo");
    tagsRepo.addTag(stored.id, "todo");

    expect(tagsRepo.listClippingsByTag("todo")).toHaveLength(1);
  });

  it("removes a tag so the clipping no longer appears under it", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "todo");
    tagsRepo.removeTag(stored.id, "todo");

    expect(tagsRepo.listClippingsByTag("todo")).toEqual([]);
  });

  it("removing a tag that was never added does not throw", () => {
    const db = openClippingsStore(":memory:");
    const tagsRepo = createSqliteTagsRepository(db);

    expect(() => tagsRepo.removeTag(999, "nonexistent")).not.toThrow();
  });

  it("supports multiple tags on the same clipping and multiple clippings under the same tag", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([
      makeHighlight({ title: "First" }),
      makeHighlight({ title: "Second" }),
    ]);
    const { clippings } = clippingsRepo.search({ sortDirection: "asc" });
    const [first, second] = clippings;
    if (first === undefined || second === undefined)
      throw new Error("expected two stored clippings");

    tagsRepo.addTag(first.id, "todo");
    tagsRepo.addTag(first.id, "favorite");
    tagsRepo.addTag(second.id, "todo");

    expect(
      tagsRepo
        .listClippingsByTag("todo")
        .map((c) => c.title)
        .sort(),
    ).toEqual(["First", "Second"]);
    expect(tagsRepo.listClippingsByTag("favorite").map((c) => c.title)).toEqual(
      ["First"],
    );
  });

  it("lists a clipping's tags in alphabetical order", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "zebra");
    tagsRepo.addTag(stored.id, "apple");

    expect(tagsRepo.listTagsForClipping(stored.id)).toEqual(["apple", "zebra"]);
  });

  it("returns an empty array for a clipping with no tags", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    expect(tagsRepo.listTagsForClipping(stored.id)).toEqual([]);
  });

  it("no longer lists a removed tag", () => {
    const db = openClippingsStore(":memory:");
    const clippingsRepo = createSqliteClippingsRepository(db);
    const tagsRepo = createSqliteTagsRepository(db);

    clippingsRepo.insert([makeHighlight()]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    tagsRepo.addTag(stored.id, "todo");
    tagsRepo.addTag(stored.id, "favorite");
    tagsRepo.removeTag(stored.id, "todo");

    expect(tagsRepo.listTagsForClipping(stored.id)).toEqual(["favorite"]);
  });
});
