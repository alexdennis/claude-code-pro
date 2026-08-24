import type { FastifyInstance } from "fastify";
import { importClippings } from "../../use-cases/import-clippings.js";
import type { ClippingsRepository } from "../../use-cases/types.js";

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
  repo: ClippingsRepository,
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

      reply.code(201);
      return importClippings(repo, text);
    },
  );

  app.get<{ Querystring: ClippingsQuery }>("/clippings", async (request) => {
    const { q, sort, limit, cursor } = request.query;
    const parsedLimit = limit !== undefined ? Number(limit) : undefined;

    return repo.search({
      ...(q !== undefined ? { query: q } : {}),
      sortDirection: sort === "asc" ? "asc" : "desc",
      ...(parsedLimit !== undefined && Number.isFinite(parsedLimit)
        ? { limit: parsedLimit }
        : {}),
      cursor: cursor ?? null,
    });
  });
}
