import type { FastifyInstance } from "fastify";
import type { ClippingsStatsRepository } from "../../storage/clippings-stats-store.js";

export function registerStatsRoutes(
  app: FastifyInstance,
  statsRepo: ClippingsStatsRepository,
): void {
  app.get("/clippings/stats", async () => {
    return statsRepo.stats();
  });
}
