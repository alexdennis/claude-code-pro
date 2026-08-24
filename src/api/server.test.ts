import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createSqliteClippingsRepository,
  openClippingsStore,
} from "../storage/clippings-store.js";
import { buildServer } from "./server.js";

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

describe("POST /clippings/import", () => {
  it("parses and persists a clean export, reporting a summary", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    const response = await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("clean-highlight.txt") },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      total: 1,
      imported: 1,
      failed: 0,
      errors: [],
    });
  });

  it("reports failures without importing them, alongside successes from the same file", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    const response = await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("mixed-validity.txt") },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.total).toBe(3);
    expect(body.imported).toBe(2);
    expect(body.failed).toBe(1);
    expect(body.errors).toHaveLength(1);
  });

  it("returns 400 when the body has no string 'text' field", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    const response = await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: 42 },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /clippings", () => {
  it("returns an empty result set before anything has been imported", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    const response = await app.inject({ method: "GET", url: "/clippings" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ clippings: [], nextCursor: null });
  });

  it("returns previously imported clippings with their stored fields intact", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("bookmark.txt") },
    });

    const response = await app.inject({ method: "GET", url: "/clippings" });
    const { clippings } = response.json();

    expect(clippings[0]).toMatchObject({
      type: "bookmark",
      title: "Fahrenheit 451",
      author: "Ray Bradbury",
      page: null,
      locationStart: 346,
      locationEnd: null,
      content: null,
    });
  });

  it("filters by the q query param", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("clean-highlight.txt") },
    });
    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("bookmark.txt") },
    });

    const response = await app.inject({
      method: "GET",
      url: "/clippings?q=fahrenheit",
    });
    const { clippings } = response.json();

    expect(clippings).toHaveLength(1);
    expect(clippings[0].title).toBe("Fahrenheit 451");
  });

  it("paginates via the cursor query param, walking to the end of the results", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("clean-highlight.txt") },
    });
    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("bookmark.txt") },
    });

    const page1 = await app.inject({
      method: "GET",
      url: "/clippings?limit=1",
    });
    const page1Body = page1.json();
    expect(page1Body.clippings).toHaveLength(1);
    expect(page1Body.nextCursor).not.toBeNull();

    const page2 = await app.inject({
      method: "GET",
      url: `/clippings?limit=1&cursor=${encodeURIComponent(page1Body.nextCursor)}`,
    });
    const page2Body = page2.json();
    expect(page2Body.clippings).toHaveLength(1);
    expect(page2Body.nextCursor).toBeNull();
    expect(page2Body.clippings[0].id).not.toBe(page1Body.clippings[0].id);
  });

  it("falls back to the default limit when the limit query param isn't a valid number", async () => {
    const app = buildServer(
      createSqliteClippingsRepository(openClippingsStore(":memory:")),
    );

    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("clean-highlight.txt") },
    });

    const response = await app.inject({
      method: "GET",
      url: "/clippings?limit=not-a-number",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().clippings).toHaveLength(1);
  });
});
