// One test per "Done when" line in the README.
import { beforeEach, describe, expect, test } from "vitest";
import { CatalogError, changePrice, listSkus, priceHistory, priceOn } from "../src/catalog.ts";
import { type Db, openDb } from "../src/db.ts";
import { seed } from "../src/seed.ts";

let db: Db;

beforeEach(() => {
  db = openDb();
  seed(db);
});

describe("Done when", () => {
  test("one SKU sells in Japan and Spain at different prices", () => {
    const on = "2026-01-15";
    const jp = listSkus(db, { market: "JP", on }).find((s) => s.code === "MB-250-M");
    const es = listSkus(db, { market: "ES", on }).find((s) => s.code === "MB-250-M");

    expect(jp?.amountMinor).toBe(1480);
    expect(es?.amountMinor).toBe(890);
  });

  test("the price on September 1 is the price before the October 1 increase", () => {
    expect(priceOn(db, { sku: "MB-250-M", market: "JP", on: "2026-09-01" })).toBe(1480);
    expect(priceOn(db, { sku: "MB-250-M", market: "JP", on: "2026-09-30" })).toBe(1480);
    expect(priceOn(db, { sku: "MB-250-M", market: "JP", on: "2026-10-01" })).toBe(1680);
  });

  test("a discontinued SKU is gone from the list, but its past prices are still there", () => {
    const codes = listSkus(db, { market: "JP", on: "2026-11-01" }).map((s) => s.code);
    expect(codes).not.toContain("MB-1000-D");

    expect(priceHistory(db, "MB-1000-D")).toEqual([
      { market: "JP", amountMinor: 4980, validFrom: "2025-04-01", validTo: "2026-07-01" },
    ]);
    expect(priceOn(db, { sku: "MB-1000-D", market: "JP", on: "2026-06-30" })).toBe(4980);
  });

  test("two prices for the same market and the same dates are rejected", () => {
    const duplicate = () =>
      changePrice(db, { sku: "MB-250-M", market: "JP", from: "2026-10-01", amountMinor: 1700 });

    expect(duplicate).toThrow(CatalogError);
    expect(duplicate).toThrow(/already has a price/);
    expect(priceOn(db, { sku: "MB-250-M", market: "JP", on: "2026-10-01" })).toBe(1680);
  });
});
