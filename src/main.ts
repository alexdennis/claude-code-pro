import { buildServer } from "./api/server.js";
import {
  createSqliteClippingsRepository,
  openClippingsStore,
} from "./storage/clippings-store.js";
import { createSqliteClippingsStatsRepository } from "./storage/clippings-stats-store.js";
import { createSqliteTagsRepository } from "./storage/tags-store.js";

const db = openClippingsStore(process.env.DB_PATH ?? "data/marginalia.sqlite");
const app = buildServer({
  clippingsRepo: createSqliteClippingsRepository(db),
  statsRepo: createSqliteClippingsStatsRepository(db),
  tagsRepo: createSqliteTagsRepository(db),
});

const port = Number(process.env.PORT ?? 3000);
const address = await app.listen({ port });
app.log.info(`Marginalia API listening at ${address}`);
