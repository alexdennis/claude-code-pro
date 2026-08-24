import type { FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { parseKindleClippings } from "../../core/kindle-clippings.js";
import {
  insertClippings,
  searchClippings,
} from "../../storage/clippings-store.js";

interface ImportBody {
  text: string;
}

interface ClippingsQuery {
  q?: string;
  sort?: string;
  limit?: string;
  cursor?: string;
}

export function registerClippingsRoutes(
  app: FastifyInstance,
  db: DatabaseSync,
): void {
  app.post<{ Body: ImportBody }>(
    "/clippings/import",
    async (request, reply) => {
      const { text } = request.body;
      if (typeof text !== "string") {
        reply.code(400);
        return {
          error: "body must be a JSON object with a string 'text' field",
        };
      }

      const results = parseKindleClippings(text);
      const successes = results.filter((r) => r.ok);
      const failures = results.filter((r) => !r.ok);

      insertClippings(
        db,
        successes.map((r) => r.clipping),
      );

      reply.code(201);
      return {
        total: results.length,
        imported: successes.length,
        failed: failures.length,
        errors: failures.map((r) => r.error),
      };
    },
  );

  app.get<{ Querystring: ClippingsQuery }>("/clippings", async (request) => {
    const { q, sort, limit, cursor } = request.query;
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;

    return searchClippings(db, {
      ...(q !== undefined ? { query: q } : {}),
      sortDirection: sort === "asc" ? "asc" : "desc",
      ...(parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? { limit: parsedLimit }
        : {}),
      cursor: cursor ?? null,
    });
  });
}
