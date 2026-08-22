import Fastify, { type FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { parseKindleClippings } from "../core/kindle-clippings.js";
import { insertClippings, listClippings } from "../storage/clippings-store.js";

interface ImportBody {
  text: string;
}

export function buildServer(db: DatabaseSync): FastifyInstance {
  const app = Fastify();

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

  app.get("/clippings", async () => listClippings(db));

  return app;
}
