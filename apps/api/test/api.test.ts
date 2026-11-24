import { testClient } from "hono/testing";
import { beforeEach, describe, expect, test } from "vitest";
import { createApp } from "../src/app.ts";
import { openDb } from "../src/db.ts";
import { seed } from "../src/seed.ts";

function client() {
  const db = openDb();
  seed(db);
  return testClient(createApp(db));
}

let api: ReturnType<typeof client>;

beforeEach(() => {
  api = client();
});

describe("GET /api/skus", () => {
  test("lists SKUs with the price on the given date", async () => {
    const res = await api.api.skus.$get({ query: { market: "ES", on: "2026-09-01" } });

    if (!res.ok) throw new Error(`Expected 200, got ${res.status}`);
    const body = await res.json();
    expect(body.map((s) => [s.code, s.amountMinor])).toEqual([
      ["MB-250-M", 890],
      ["SO-ETH-200-L", 1250],
    ]);
  });

  test("returns 400 for a bad date", async () => {
    const res = await api.api.skus.$get({ query: { market: "ES", on: "2026-02-30" } });
    expect(res.status).toBe(400);
  });

  test("returns 404 for an unknown market", async () => {
    const res = await api.api.skus.$get({ query: { market: "FR", on: "2026-09-01" } });
    expect(res.status).toBe(404);
  });
});

describe("price changes", () => {
  test("returns 409 for a second price on the same date", async () => {
    const res = await api.api.skus[":code"].prices.$post({
      param: { code: "MB-250-M" },
      json: { market: "JP", from: "2026-10-01", amountMinor: 1700 },
    });

    expect(res.status).toBe(409);
  });

  test("a new price shows up from its start date", async () => {
    const created = await api.api.skus[":code"].prices.$post({
      param: { code: "SO-ETH-200-L" },
      json: { market: "ES", from: "2027-01-01", amountMinor: 1350 },
    });
    expect(created.status).toBe(201);

    const res = await api.api.skus[":code"].price.$get({
      param: { code: "SO-ETH-200-L" },
      query: { market: "ES", on: "2027-01-01" },
    });
    expect(await res.json()).toEqual({ amountMinor: 1350 });
  });
});

describe("catalog setup", () => {
  test("creates a family, a SKU, and launches it", async () => {
    expect((await api.api.families.$post({ json: { name: "Decaf" } })).status).toBe(201);
    const sku = await api.api.skus.$post({
      json: {
        code: "DC-250-M",
        family: "Decaf",
        name: "Decaf 250 g, medium roast",
        roast: "medium",
        weightG: 250,
        origin: "Mexico",
      },
    });
    expect(sku.status).toBe(201);

    const launched = await api.api.skus[":code"].launches.$post({
      param: { code: "DC-250-M" },
      json: { market: "ES", on: "2026-11-01", amountMinor: 950 },
    });
    expect(launched.status).toBe(201);
  });

  test("discontinues a SKU and keeps its events", async () => {
    const res = await api.api.skus[":code"].discontinue.$post({
      param: { code: "SO-ETH-200-L" },
      json: { on: "2026-12-01" },
    });
    expect(res.status).toBe(200);

    const events = await api.api.skus[":code"].events.$get({ param: { code: "SO-ETH-200-L" } });
    const kinds = (await events.json()).map((e) => e.kind);
    expect(kinds).toEqual(["launch", "launch", "discontinue"]);
  });

  test("returns the price history and the markets", async () => {
    const prices = await api.api.skus[":code"].prices.$get({ param: { code: "MB-1000-D" } });
    expect(await prices.json()).toHaveLength(1);

    const markets = await api.api.markets.$get();
    expect((await markets.json()).map((m) => m.currency)).toEqual(["EUR", "JPY"]);
  });

  test("returns 404 for an unknown SKU", async () => {
    const res = await api.api.skus[":code"].events.$get({ param: { code: "NOPE" } });
    expect(res.status).toBe(404);
  });
});
