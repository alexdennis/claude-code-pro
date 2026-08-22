import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";
import { openClippingsStore } from "../storage/clippings-store.js";

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
    const app = buildServer(openClippingsStore(":memory:"));

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
    const app = buildServer(openClippingsStore(":memory:"));

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
    const app = buildServer(openClippingsStore(":memory:"));

    const response = await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: 42 },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /clippings", () => {
  it("returns an empty array before anything has been imported", async () => {
    const app = buildServer(openClippingsStore(":memory:"));

    const response = await app.inject({ method: "GET", url: "/clippings" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it("returns previously imported clippings with their stored fields intact", async () => {
    const app = buildServer(openClippingsStore(":memory:"));

    await app.inject({
      method: "POST",
      url: "/clippings/import",
      payload: { text: loadFixture("bookmark.txt") },
    });

    const response = await app.inject({ method: "GET", url: "/clippings" });
    const [clipping] = response.json();

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
});
