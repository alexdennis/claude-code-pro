import Fastify, { type FastifyInstance } from "fastify";
import type { DatabaseSync } from "node:sqlite";
import { registerClippingsRoutes } from "./routes/clippings.js";

export function buildServer(db: DatabaseSync): FastifyInstance {
  const app = Fastify();

  registerClippingsRoutes(app, db);

  return app;
}
