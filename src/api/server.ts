import Fastify, { type FastifyInstance } from "fastify";
import type { ClippingsRepository } from "../use-cases/types.js";
import type { ClippingsStatsRepository } from "../storage/clippings-stats-store.js";
import type { TagsRepository } from "../storage/tags-store.js";
import { registerClippingsRoutes } from "./routes/clippings.js";
import { registerExportRoutes } from "./routes/export.js";
import { registerStatsRoutes } from "./routes/stats.js";
import { registerTagsRoutes } from "./routes/tags.js";

export interface ServerDependencies {
  clippingsRepo: ClippingsRepository;
  statsRepo: ClippingsStatsRepository;
  tagsRepo: TagsRepository;
}

export function buildServer(deps: ServerDependencies): FastifyInstance {
  const app = Fastify();

  registerClippingsRoutes(app, deps.clippingsRepo);
  registerExportRoutes(app, deps.clippingsRepo);
  registerStatsRoutes(app, deps.statsRepo);
  registerTagsRoutes(app, deps.tagsRepo);

  return app;
}
