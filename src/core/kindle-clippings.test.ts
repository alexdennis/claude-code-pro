import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseKindleClippings } from "./kindle-clippings.js";
import type { Clipping, ParseFailure, ParseResult } from "./kindle-clippings.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures", "kindle-clippings");

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

function expectSuccess(result: ParseResult | undefined): Clipping {
  if (result === undefined || !result.ok) throw new Error("expected success");
  return result.clipping;
}

function expectFailure(result: ParseResult | undefined): ParseFailure {
  if (result === undefined || result.ok) throw new Error("expected failure");
  return result;
}

describe("parseKindleClippings", () => {
  it("parses a clean highlight with page, location range, and a full date", () => {
    const results = parseKindleClippings(loadFixture("clean-highlight.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
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
    expect(clipping.addedAt).toBeInstanceOf(Date);
    expect(clipping.addedAt?.getFullYear()).toBe(2021);
  });

  it("parses a note as an independent record, not linked to a highlight", () => {
    const results = parseKindleClippings(loadFixture("note.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
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

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
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

    const clipping = expectSuccess(results[0]);
    expect(clipping.title).toBe("Meeting Notes - Q3 Planning");
    expect(clipping.author).toBeNull();
  });

  it("parses a single location with no range and no page", () => {
    const results = parseKindleClippings(loadFixture("single-location.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
      type: "highlight",
      page: null,
      locationStart: 2044,
      locationEnd: null,
    });
  });

  it("does not deduplicate repeated highlights from the same location", () => {
    const results = parseKindleClippings(loadFixture("duplicate-highlight.txt"));
    expect(results).toHaveLength(2);

    const first = expectSuccess(results[0]);
    const second = expectSuccess(results[1]);
    expect(first.content).toBe(second.content);
    expect(first.locationStart).toBe(second.locationStart);
    expect(first.addedAtRaw).not.toBe(second.addedAtRaw);
  });

  it("preserves unicode content and accented characters exactly", () => {
    const results = parseKindleClippings(loadFixture("unicode-content.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping.author).toBe("Antoine de Saint-Exupéry");
    expect(clipping.content).toBe(
      "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux. 心を込めて見なければ、大切なことは見えない。 ✨",
    );
  });

  it("survives a stray extra blank line without corrupting content", () => {
    const results = parseKindleClippings(loadFixture("stray-blank-line.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping.content).toBe(
      "Nothing in life is as important as you think it is, while you are thinking about it.",
    );
  });

  it("strips a leading UTF-8 BOM instead of corrupting the first entry's title", () => {
    const results = parseKindleClippings(loadFixture("bom.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping.title).toBe("The Design of Everyday Things");
  });

  it("returns a ParseFailure for an entry it cannot parse, without losing the raw text", () => {
    const results = parseKindleClippings(loadFixture("malformed-entry.txt"));
    expect(results).toHaveLength(1);

    const failure = expectFailure(results[0]);
    expect(failure.error).toEqual(expect.any(String));
    expect(failure.raw).toContain("Untitled Highlight Export Glitch");
  });

  it("keeps valid entries intact on either side of a malformed one, in order", () => {
    const results = parseKindleClippings(loadFixture("mixed-validity.txt"));
    expect(results).toHaveLength(3);

    const before = expectSuccess(results[0]);
    expect(before.title).toBe("Atomic Habits");
    expect(before.content).toBe("Habits are the compound interest of self-improvement.");

    const failure = expectFailure(results[1]);
    expect(failure.raw).toContain("Untitled Highlight Export Glitch");

    const after = expectSuccess(results[2]);
    expect(after.title).toBe("Deep Work");
    expect(after.content).toBe(
      "To produce at your peak level you need to work for extended periods with full concentration.",
    );
  });

  it("parses an entry with Windows CRLF line endings the same as LF", () => {
    const results = parseKindleClippings(loadFixture("crlf-line-endings.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
      type: "highlight",
      title: "The Design of Everyday Things",
      author: "Don Norman",
      page: 34,
      locationStart: 512,
      locationEnd: 514,
      content:
        "Good design is actually a lot harder to notice than poor design, in part because good designs fit our needs so well that the design is invisible.",
    });
    expect(clipping.content).not.toContain("\r");
  });

  it("recovers the last entry when the file is truncated with no trailing separator", () => {
    const results = parseKindleClippings(loadFixture("missing-trailing-separator.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping).toMatchObject({
      type: "highlight",
      title: "Zero to One",
      author: "Peter Thiel",
      page: 5,
      locationStart: 88,
      locationEnd: 90,
      content: "Doing what already exists takes the world from 1 to n.",
    });
  });

  it("returns a ParseFailure for a metadata line matching no known clipping type", () => {
    const results = parseKindleClippings(loadFixture("unrecognized-metadata-line.txt"));
    expect(results).toHaveLength(1);

    const failure = expectFailure(results[0]);
    expect(failure.raw).toContain("Some Corrupted Export");
  });

  it("returns an empty array for empty input", () => {
    expect(parseKindleClippings("")).toEqual([]);
  });

  it("succeeds with addedAt: null when the date cannot be parsed, keeping addedAtRaw", () => {
    const results = parseKindleClippings(loadFixture("unparseable-date.txt"));
    expect(results).toHaveLength(1);

    const clipping = expectSuccess(results[0]);
    expect(clipping.title).toBe("The Pragmatic Programmer");
    expect(clipping.addedAt).toBeNull();
    expect(clipping.addedAtRaw).toBe("Whenever I felt like it");
  });
});
