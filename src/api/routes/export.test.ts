import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type {
  ClippingsRepository,
  SearchOptions,
  SearchResult,
  StoredClipping,
} from "../../use-cases/types.js";
import { registerExportRoutes } from "./export.js";

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
    location: { start: 100, end: 120 },
    addedAt: null,
    addedAtRaw: "",
    content: "It was a pleasure to burn.",
    ...overrides,
  } as StoredClipping;
}

function buildApp(repo: ClippingsRepository) {
  const app = Fastify();
  registerExportRoutes(app, repo);
  return app;
}

describe("GET /clippings/export", () => {
  it("returns the clippings formatted as markdown with a text/markdown content type", async () => {
    const repo = createMockRepo([makeClipping()]);
    const app = buildApp(repo);

    const response = await app.inject({
      method: "GET",
      url: "/clippings/export",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/markdown");
    expect(response.body).toBe(
      "## Fahrenheit 451\n*Ray Bradbury*\n\n> It was a pleasure to burn.\n\n---\n",
    );
  });

  it("returns an empty markdown body when there are no clippings", async () => {
    const repo = createMockRepo([]);
    const app = buildApp(repo);

    const response = await app.inject({
      method: "GET",
      url: "/clippings/export",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("");
  });

  it("passes the q and sort query params through to repo.search", async () => {
    const repo = createMockRepo([]);
    const app = buildApp(repo);

    await app.inject({
      method: "GET",
      url: "/clippings/export?q=fahrenheit&sort=asc",
    });

    expect(repo.searchCalls).toEqual([
      { query: "fahrenheit", sortDirection: "asc" },
    ]);
  });

  it("omits sortDirection when sort is not a recognized value", async () => {
    const repo = createMockRepo([]);
    const app = buildApp(repo);

    await app.inject({
      method: "GET",
      url: "/clippings/export",
    });

    expect(repo.searchCalls).toEqual([{}]);
  });
});
