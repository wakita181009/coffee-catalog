import { beforeEach, describe, expect, test } from "vitest";
import {
  addFamily,
  addSku,
  changePrice,
  discontinue,
  eventsFor,
  isIsoDate,
  launch,
  listFamilies,
  listMarkets,
  listSkus,
  priceHistory,
  priceOn,
} from "../src/catalog.ts";
import { type Db, openDb } from "../src/db.ts";
import { isEmpty, seed } from "../src/seed.ts";

let db: Db;

beforeEach(() => {
  db = openDb();
  seed(db);
});

describe("isIsoDate", () => {
  test("accepts real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
  });

  test("rejects malformed or impossible dates", () => {
    expect(isIsoDate("2026-2-1")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("tomorrow")).toBe(false);
  });
});

describe("seed", () => {
  test("reports whether the database is empty", () => {
    expect(isEmpty(db)).toBe(false);
    expect(isEmpty(openDb())).toBe(true);
  });

  test("creates both markets", () => {
    expect(listMarkets(db).map((m) => m.code)).toEqual(["ES", "JP"]);
  });
});

describe("families and SKUs", () => {
  test("lists family names in order", () => {
    addFamily(db, "Decaf");
    expect(listFamilies(db)).toEqual(["Decaf", "Morning Blend", "Single Origin"]);
  });

  test("rejects a duplicate family", () => {
    expect(() => addFamily(db, "Morning Blend")).toThrow(/already exists/);
  });

  test("rejects a SKU in an unknown family", () => {
    expect(() =>
      addSku(db, {
        code: "X-1",
        family: "Unknown",
        name: "X",
        roast: "dark",
        weightG: 100,
        origin: "Peru",
      }),
    ).toThrow(/Family Unknown does not exist/);
  });

  test("rejects a duplicate SKU code", () => {
    expect(() =>
      addSku(db, {
        code: "MB-250-M",
        family: "Morning Blend",
        name: "Copy",
        roast: "medium",
        weightG: 250,
        origin: "Brazil",
      }),
    ).toThrow(/already exists/);
  });
});

describe("launch", () => {
  test("lists the SKU only from its launch date", () => {
    const before = listSkus(db, { market: "JP", on: "2026-01-31" }).map((s) => s.code);
    const after = listSkus(db, { market: "JP", on: "2026-02-01" }).map((s) => s.code);

    expect(before).not.toContain("SO-ETH-200-L");
    expect(after).toContain("SO-ETH-200-L");
  });

  test("rejects a second launch in the same market", () => {
    expect(() =>
      launch(db, { sku: "MB-250-M", market: "JP", on: "2026-01-01", amountMinor: 1 }),
    ).toThrow(/already sells in JP/);
  });

  test("rejects an unknown market or SKU", () => {
    expect(() =>
      launch(db, { sku: "MB-250-M", market: "FR", on: "2026-01-01", amountMinor: 1 }),
    ).toThrow(/Market FR does not exist/);
    expect(() =>
      launch(db, { sku: "NOPE", market: "JP", on: "2026-01-01", amountMinor: 1 }),
    ).toThrow(/SKU NOPE does not exist/);
  });

  test("rejects a discontinued SKU", () => {
    expect(() =>
      launch(db, { sku: "MB-1000-D", market: "ES", on: "2026-08-01", amountMinor: 3000 }),
    ).toThrow(/discontinued/);
  });

  test("rejects a bad date or amount", () => {
    expect(() =>
      launch(db, { sku: "MB-250-M", market: "ES", on: "2026-13-01", amountMinor: 1 }),
    ).toThrow(/must be a date/);
    expect(() =>
      launch(db, { sku: "MB-250-M", market: "ES", on: "2026-01-01", amountMinor: -1 }),
    ).toThrow(/non-negative integer/);
  });
});

describe("changePrice", () => {
  test("closes the previous price at the new start date", () => {
    const jp = priceHistory(db, "MB-250-M").filter((p) => p.market === "JP");

    expect(jp).toEqual([
      { market: "JP", amountMinor: 1480, validFrom: "2025-04-01", validTo: "2026-10-01" },
      { market: "JP", amountMinor: 1680, validFrom: "2026-10-01", validTo: null },
    ]);
  });

  test("rejects a price that starts inside an earlier closed range", () => {
    expect(() =>
      changePrice(db, { sku: "MB-250-M", market: "JP", from: "2026-05-01", amountMinor: 1500 }),
    ).toThrow(/already has a price/);
  });

  test("rejects a market where the SKU is not sold", () => {
    expect(() =>
      changePrice(db, { sku: "MB-1000-D", market: "ES", from: "2026-10-01", amountMinor: 1 }),
    ).toThrow(/discontinued/);
    expect(() =>
      changePrice(db, { sku: "SO-ETH-200-L", market: "FR", from: "2026-10-01", amountMinor: 1 }),
    ).toThrow(/does not sell in FR/);
  });

  test("records an event", () => {
    const kinds = eventsFor(db, "MB-250-M").map((e) => `${e.kind}:${e.market}`);
    expect(kinds).toEqual(["launch:JP", "launch:ES", "price_change:JP", "price_change:ES"]);
  });
});

describe("discontinue", () => {
  test("keeps the SKU listed until the day before it is discontinued", () => {
    const lastDay = listSkus(db, { market: "JP", on: "2026-06-30" }).map((s) => s.code);
    expect(lastDay).toContain("MB-1000-D");
  });

  test("rejects discontinuing twice", () => {
    expect(() => discontinue(db, { sku: "MB-1000-D", on: "2026-08-01" })).toThrow(
      /already discontinued/,
    );
  });

  test("rejects a date before a scheduled price", () => {
    expect(() => discontinue(db, { sku: "MB-250-M", on: "2026-09-01" })).toThrow(
      /starts on or after/,
    );
  });

  test("leaves the record unchanged when it fails", () => {
    expect(() => discontinue(db, { sku: "MB-250-M", on: "2026-09-01" })).toThrow();
    expect(priceOn(db, { sku: "MB-250-M", market: "JP", on: "2026-12-01" })).toBe(1680);
  });
});

describe("database guard", () => {
  test("a trigger rejects overlapping prices written directly in SQL", () => {
    const insert = () =>
      db
        .prepare(
          `INSERT INTO prices (sku_id, market_code, amount_minor, valid_from)
           SELECT id, 'JP', 1, '2026-11-01' FROM skus WHERE code = 'MB-250-M'`,
        )
        .run();

    expect(insert).toThrow(/price_overlap/);
  });

  test("a trigger rejects an update that makes ranges overlap", () => {
    const update = () =>
      db
        .prepare(
          `UPDATE prices SET valid_to = NULL
           WHERE valid_to = '2026-10-01' AND market_code = 'JP'`,
        )
        .run();

    expect(update).toThrow(/price_overlap/);
  });
});
