import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  createSqliteClippingsRepository,
  openClippingsStore,
} from "../../storage/clippings-store.js";
import { createSqliteTagsRepository } from "../../storage/tags-store.js";
import { registerTagsRoutes } from "./tags.js";
import type { Highlight } from "../../core/kindle-clippings.js";

function buildTestApp() {
  const db = openClippingsStore(":memory:");
  const clippingsRepo = createSqliteClippingsRepository(db);
  const tagsRepo = createSqliteTagsRepository(db);

  const app = Fastify();
  registerTagsRoutes(app, tagsRepo);

  return { app, clippingsRepo };
}

const highlight: Highlight = {
  type: "highlight",
  title: "Meditations",
  author: "Marcus Aurelius",
  page: 12,
  locationStart: 200,
  locationEnd: 202,
  addedAt: new Date("2026-08-12T15:15:00.000Z"),
  addedAtRaw: "Wednesday, August 12, 2026 3:15:00 PM",
  content: "You have power over your mind, not outside events.",
};

describe("POST /clippings/:id/tags", () => {
  it("adds a tag to a clipping", async () => {
    const { app, clippingsRepo } = buildTestApp();
    clippingsRepo.insert([highlight]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    const response = await app.inject({
      method: "POST",
      url: `/clippings/${stored.id}/tags`,
      payload: { tag: "todo" },
    });

    expect(response.statusCode).toBe(201);
  });

  it("returns 400 when the id path param isn't an integer", async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/clippings/not-a-number/tags",
      payload: { tag: "todo" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when the body has no string 'tag' field", async () => {
    const { app, clippingsRepo } = buildTestApp();
    clippingsRepo.insert([highlight]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    const response = await app.inject({
      method: "POST",
      url: `/clippings/${stored.id}/tags`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("DELETE /clippings/:id/tags/:tag", () => {
  it("removes a tag from a clipping", async () => {
    const { app, clippingsRepo } = buildTestApp();
    clippingsRepo.insert([highlight]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    await app.inject({
      method: "POST",
      url: `/clippings/${stored.id}/tags`,
      payload: { tag: "todo" },
    });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/clippings/${stored.id}/tags/todo`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const listResponse = await app.inject({
      method: "GET",
      url: "/tags/todo/clippings",
    });
    expect(listResponse.json().clippings).toEqual([]);
  });

  it("returns 400 when the id path param isn't an integer", async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: "DELETE",
      url: "/clippings/not-a-number/tags/todo",
    });

    expect(response.statusCode).toBe(400);
  });
});

describe("GET /tags/:tag/clippings", () => {
  it("returns clippings tagged with the given tag", async () => {
    const { app, clippingsRepo } = buildTestApp();
    clippingsRepo.insert([highlight]);
    const {
      clippings: [stored],
    } = clippingsRepo.search();
    if (stored === undefined) throw new Error("expected a stored clipping");

    await app.inject({
      method: "POST",
      url: `/clippings/${stored.id}/tags`,
      payload: { tag: "todo" },
    });

    const response = await app.inject({
      method: "GET",
      url: "/tags/todo/clippings",
    });

    expect(response.statusCode).toBe(200);
    const { clippings } = response.json();
    expect(clippings).toHaveLength(1);
    expect(clippings[0]).toMatchObject({ title: "Meditations" });
  });

  it("returns an empty array for a tag nothing has been given", async () => {
    const { app } = buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/tags/nonexistent/clippings",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ clippings: [] });
  });
});
