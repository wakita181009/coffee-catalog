import { createApp } from "@coffee-catalog/api";
import { openDb } from "@coffee-catalog/api/db";
import { seed } from "@coffee-catalog/api/seed";
import { vi } from "vitest";

// Routes the web client's fetch calls into an in-memory API, so components are tested
// against the real request handlers and seed data instead of hand-written fixtures.
export function serveApi() {
  const db = openDb();
  seed(db);
  const app = createApp(db);
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((input, init) => Promise.resolve(app.request(String(input), init)));
}
