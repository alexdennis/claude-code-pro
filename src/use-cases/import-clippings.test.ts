import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Clipping } from "../core/kindle-clippings.js";
import { importClippings } from "./import-clippings.js";
import type { ClippingsRepository, SearchResult } from "./types.js";

const fixturesDir = path.join(
  import.meta.dirname,
  "..",
  "core",
  "fixtures",
  "kindle-clippings",
);

function loadFixture(name: string): string {
  return readFileSync(path.join(fixturesDir, name), "utf-8");
}

function createMockRepo(): ClippingsRepository & {
  insertCalls: readonly Clipping[][];
} {
  const insertCalls: Clipping[][] = [];
  return {
    insertCalls,
    insert(clippings: readonly Clipping[]): void {
      insertCalls.push([...clippings]);
    },
    search(): SearchResult {
      return { clippings: [], nextCursor: null };
    },
  };
}

describe("importClippings", () => {
  it("delegates parsed clippings to the repository and returns a summary", () => {
    const repo = createMockRepo();

    const result = importClippings(repo, loadFixture("clean-highlight.txt"));

    expect(result).toEqual({
      total: 1,
      imported: 1,
      failed: 0,
      errors: [],
    });
    expect(repo.insertCalls).toHaveLength(1);
    expect(repo.insertCalls[0]).toHaveLength(1);
  });

  it("separates successes from failures, only inserting valid clippings", () => {
    const repo = createMockRepo();

    const result = importClippings(repo, loadFixture("mixed-validity.txt"));

    expect(result.total).toBe(3);
    expect(result.imported).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    // Only the 2 valid clippings should have been passed to insert
    expect(repo.insertCalls[0]).toHaveLength(2);
  });

  it("calls insert with an empty array when all entries fail to parse", () => {
    const repo = createMockRepo();

    const result = importClippings(repo, "this is not a valid clipping file");

    expect(result.imported).toBe(0);
    expect(result.failed).toBe(result.total);
    expect(repo.insertCalls).toHaveLength(1);
    expect(repo.insertCalls[0]).toHaveLength(0);
  });
});
