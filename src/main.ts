import { buildServer } from "./api/server.js";
import {
  createSqliteClippingsRepository,
  openClippingsStore,
} from "./storage/clippings-store.js";

const db = openClippingsStore(process.env.DB_PATH ?? "data/marginalia.sqlite");
const app = buildServer(createSqliteClippingsRepository(db));

const port = Number(process.env.PORT ?? 3000);
const address = await app.listen({ port });
app.log.info(`Marginalia API listening at ${address}`);
