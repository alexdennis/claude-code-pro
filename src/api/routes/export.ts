import type { FastifyInstance } from "fastify";
import { exportClippingsAsMarkdown } from "../../use-cases/export-markdown.js";
import type { ClippingsRepository } from "../../use-cases/types.js";

interface ExportQuery {
  q?: string;
  sort?: string;
}

export function registerExportRoutes(
  app: FastifyInstance,
  repo: ClippingsRepository,
): void {
  app.get<{ Querystring: ExportQuery }>(
    "/clippings/export",
    async (request, reply) => {
      const { q, sort } = request.query;

      const markdown = exportClippingsAsMarkdown(repo, {
        ...(q !== undefined ? { query: q } : {}),
        ...(sort === "asc" || sort === "desc" ? { sortDirection: sort } : {}),
      });

      reply.header("Content-Type", "text/markdown");
      return markdown;
    },
  );
}
