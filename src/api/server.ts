import Fastify, { type FastifyInstance } from "fastify";
import type { ClippingsRepository } from "../use-cases/types.js";
import { registerClippingsRoutes } from "./routes/clippings.js";

export function buildServer(repo: ClippingsRepository): FastifyInstance {
  const app = Fastify();

  registerClippingsRoutes(app, repo);

  return app;
}
