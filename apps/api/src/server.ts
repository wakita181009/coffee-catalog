import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { openDb } from "./db.ts";
import { isEmpty, seed } from "./seed.ts";

const DB_PATH = process.env.DB_PATH ?? "data/coffee.db";
const PORT = Number(process.env.PORT ?? 8787);

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = openDb(DB_PATH);
if (isEmpty(db)) {
  seed(db);
  console.log(`Seeded sample data into ${DB_PATH}`);
}

serve({ fetch: createApp(db).fetch, port: PORT }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
