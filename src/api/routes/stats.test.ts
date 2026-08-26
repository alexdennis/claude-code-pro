import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  insertClippings,
  openClippingsStore,
} from "../../storage/clippings-store.js";
import { createSqliteClippingsStatsRepository } from "../../storage/clippings-stats-store.js";
import type { Highlight } from "../../core/kindle-clippings.js";
import { registerStatsRoutes } from "./stats.js";

function makeHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return {
    type: "highlight",
    title: "Meditations",
    author: "Marcus Aurelius",
    page: 12,
    location: { start: 200, end: 202 },
    addedAt: new Date("2026-08-12T15:15:00.000Z"),
    addedAtRaw: "Wednesday, August 12, 2026 3:15:00 PM",
    content: "You have power over your mind, not outside events.",
    ...overrides,
  };
}

describe("GET /clippings/stats", () => {
  it("returns all-zero stats before anything has been imported", async () => {
    const app = Fastify();
    registerStatsRoutes(
      app,
      createSqliteClippingsStatsRepository(openClippingsStore(":memory:")),
    );

    const response = await app.inject({
      method: "GET",
      url: "/clippings/stats",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 0,
      byType: { highlight: 0, note: 0, bookmark: 0 },
      distinctAuthorCount: 0,
    });
  });

  it("reflects previously inserted clippings", async () => {
    const db = openClippingsStore(":memory:");
    insertClippings(db, [
      makeHighlight({ author: "Marcus Aurelius" }),
      makeHighlight({ author: "Ray Bradbury" }),
    ]);

    const app = Fastify();
    registerStatsRoutes(app, createSqliteClippingsStatsRepository(db));

    const response = await app.inject({
      method: "GET",
      url: "/clippings/stats",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      total: 2,
      byType: { highlight: 2, note: 0, bookmark: 0 },
      distinctAuthorCount: 2,
    });
  });
});
