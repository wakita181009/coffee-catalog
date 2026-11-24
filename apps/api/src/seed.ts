import { addFamily, addMarket, addSku, changePrice, discontinue, launch } from "./catalog.ts";
import type { Db } from "./db.ts";

// Fictional products. Amounts are in minor units: yen for JP, cents for ES.
export function seed(db: Db): void {
  addMarket(db, { code: "JP", name: "Japan", currency: "JPY", minorUnit: 0 });
  addMarket(db, { code: "ES", name: "Spain", currency: "EUR", minorUnit: 2 });

  addFamily(db, "Morning Blend");
  addFamily(db, "Single Origin");

  addSku(db, {
    code: "MB-250-M",
    family: "Morning Blend",
    name: "Morning Blend 250 g, medium roast",
    roast: "medium",
    weightG: 250,
    origin: "Brazil, Colombia",
  });
  addSku(db, {
    code: "MB-1000-D",
    family: "Morning Blend",
    name: "Morning Blend 1 kg, dark roast",
    roast: "dark",
    weightG: 1000,
    origin: "Brazil, Colombia",
  });
  addSku(db, {
    code: "SO-ETH-200-L",
    family: "Single Origin",
    name: "Ethiopia Yirgacheffe 200 g, light roast",
    roast: "light",
    weightG: 200,
    origin: "Ethiopia",
  });

  launch(db, { sku: "MB-250-M", market: "JP", on: "2025-04-01", amountMinor: 1480 });
  launch(db, { sku: "MB-250-M", market: "ES", on: "2025-06-01", amountMinor: 890 });
  launch(db, { sku: "MB-1000-D", market: "JP", on: "2025-04-01", amountMinor: 4980 });
  launch(db, { sku: "SO-ETH-200-L", market: "ES", on: "2025-09-15", amountMinor: 1250 });
  launch(db, { sku: "SO-ETH-200-L", market: "JP", on: "2026-02-01", amountMinor: 2200 });

  // Green coffee prices went up; new shelf prices apply from October 1.
  changePrice(db, { sku: "MB-250-M", market: "JP", from: "2026-10-01", amountMinor: 1680 });
  changePrice(db, { sku: "MB-250-M", market: "ES", from: "2026-10-01", amountMinor: 990 });

  discontinue(db, { sku: "MB-1000-D", on: "2026-07-01" });
}

export function isEmpty(db: Db): boolean {
  return db.prepare("SELECT 1 FROM markets LIMIT 1").get() === undefined;
}
