import { describe, expect, it } from "vitest";
import { exportClippingsAsMarkdown } from "./export-markdown.js";
import type {
  ClippingsRepository,
  SearchOptions,
  SearchResult,
  StoredClipping,
} from "./types.js";

function createMockRepo(
  clippings: readonly StoredClipping[],
): ClippingsRepository & { searchCalls: (SearchOptions | undefined)[] } {
  const searchCalls: (SearchOptions | undefined)[] = [];
  return {
    searchCalls,
    insert(): void {
      throw new Error("not implemented");
    },
    search(options?: SearchOptions): SearchResult {
      searchCalls.push(options);
      return { clippings: [...clippings], nextCursor: null };
    },
  };
}

function makeClipping(overrides: Partial<StoredClipping> = {}): StoredClipping {
  return {
    id: 1,
    type: "highlight",
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    page: null,
    locationStart: 100,
    locationEnd: 120,
    addedAt: null,
    addedAtRaw: "",
    content: "It was a pleasure to burn.",
    ...overrides,
  } as StoredClipping;
}

describe("exportClippingsAsMarkdown", () => {
  it("formats each clipping as a markdown block", () => {
    const repo = createMockRepo([makeClipping()]);

    const markdown = exportClippingsAsMarkdown(repo);

    expect(markdown).toBe(
      "## Fahrenheit 451\n*Ray Bradbury*\n\n> It was a pleasure to burn.\n\n---\n",
    );
  });

  it("joins multiple clippings into separate blocks", () => {
    const repo = createMockRepo([
      makeClipping({ id: 1, title: "Book One", content: "First quote" }),
      makeClipping({ id: 2, title: "Book Two", content: "Second quote" }),
    ]);

    const markdown = exportClippingsAsMarkdown(repo);

    expect(markdown).toBe(
      "## Book One\n*Ray Bradbury*\n\n> First quote\n\n---\n\n" +
        "## Book Two\n*Ray Bradbury*\n\n> Second quote\n\n---\n",
    );
  });

  it("handles a null author gracefully", () => {
    const repo = createMockRepo([makeClipping({ author: null })]);

    const markdown = exportClippingsAsMarkdown(repo);

    expect(markdown).toContain("*Unknown author*");
  });

  it("handles null content gracefully (e.g. bookmarks)", () => {
    const repo = createMockRepo([
      makeClipping({ type: "bookmark", content: null }),
    ]);

    const markdown = exportClippingsAsMarkdown(repo);

    expect(markdown).toBe("## Fahrenheit 451\n*Ray Bradbury*\n\n> \n\n---\n");
  });

  it("returns an empty string when there are no clippings", () => {
    const repo = createMockRepo([]);

    const markdown = exportClippingsAsMarkdown(repo);

    expect(markdown).toBe("");
  });

  it("passes options through to repo.search", () => {
    const repo = createMockRepo([]);
    const options: SearchOptions = {
      query: "fahrenheit",
      sortDirection: "asc",
    };

    exportClippingsAsMarkdown(repo, options);

    expect(repo.searchCalls).toEqual([options]);
  });
});
