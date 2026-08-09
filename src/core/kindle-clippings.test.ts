import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseKindleClippings } from "./kindle-clippings.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures", "kindle-clippings");

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

describe("parseKindleClippings", () => {
  it("parses a clean highlight with page, location range, and a full date", () => {
    const results = parseKindleClippings(loadFixture("clean-highlight.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping).toMatchObject({
      type: "highlight",
      title: "The Design of Everyday Things",
      author: "Don Norman",
      page: 34,
      locationStart: 512,
      locationEnd: 514,
      addedAtRaw: "Tuesday, 12 January 2021 09:15:22",
      content:
        "Good design is actually a lot harder to notice than poor design, in part because good designs fit our needs so well that the design is invisible.",
    });
    expect(result.clipping.addedAt).toBeInstanceOf(Date);
    expect(result.clipping.addedAt?.getFullYear()).toBe(2021);
  });

  it("parses a note as an independent record, not linked to a highlight", () => {
    const results = parseKindleClippings(loadFixture("note.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping).toMatchObject({
      type: "note",
      title: "The Design of Everyday Things",
      author: "Don Norman",
      page: 34,
      locationStart: 513,
      locationEnd: null,
      content: "Reminds me of the door handle example from chapter 1.",
    });
  });

  it("parses a bookmark with no page and no content", () => {
    const results = parseKindleClippings(loadFixture("bookmark.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping).toMatchObject({
      type: "bookmark",
      title: "Fahrenheit 451",
      author: "Ray Bradbury",
      page: null,
      locationStart: 346,
      locationEnd: null,
      content: null,
    });
  });

  it("treats a title with no parenthesized author as author: null", () => {
    const results = parseKindleClippings(loadFixture("author-less-title.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping.title).toBe("Meeting Notes - Q3 Planning");
    expect(result.clipping.author).toBeNull();
  });

  it("parses a single location with no range and no page", () => {
    const results = parseKindleClippings(loadFixture("single-location.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping).toMatchObject({
      type: "highlight",
      page: null,
      locationStart: 2044,
      locationEnd: null,
    });
  });

  it("does not deduplicate repeated highlights from the same location", () => {
    const results = parseKindleClippings(loadFixture("duplicate-highlight.txt"));
    expect(results).toHaveLength(2);

    const [first, second] = results;
    if (first === undefined || second === undefined || !first.ok || !second.ok) {
      throw new Error("expected both entries to parse successfully");
    }

    expect(first.clipping.content).toBe(second.clipping.content);
    expect(first.clipping.locationStart).toBe(second.clipping.locationStart);
    expect(first.clipping.addedAtRaw).not.toBe(second.clipping.addedAtRaw);
  });

  it("preserves unicode content and accented characters exactly", () => {
    const results = parseKindleClippings(loadFixture("unicode-content.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping.author).toBe("Antoine de Saint-Exupéry");
    expect(result.clipping.content).toBe(
      "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. 心を込めて見なければ、大切なことは見えない。 ✨",
    );
  });

  it("survives a stray extra blank line without corrupting content", () => {
    const results = parseKindleClippings(loadFixture("stray-blank-line.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping.content).toBe(
      "Nothing in life is as important as you think it is, while you are thinking about it.",
    );
  });

  it("strips a leading UTF-8 BOM instead of corrupting the first entry's title", () => {
    const results = parseKindleClippings(loadFixture("bom.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || !result.ok) throw new Error("expected success");

    expect(result.clipping.title).toBe("The Design of Everyday Things");
  });

  it("returns a ParseFailure for an entry it cannot parse, without losing the raw text", () => {
    const results = parseKindleClippings(loadFixture("malformed-entry.txt"));
    expect(results).toHaveLength(1);

    const [result] = results;
    if (result === undefined || result.ok) throw new Error("expected failure");

    expect(result.error).toEqual(expect.any(String));
    expect(result.raw).toContain("Untitled Highlight Export Glitch");
  });
});
