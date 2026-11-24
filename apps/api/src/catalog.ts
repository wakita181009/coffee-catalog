import { type Db, transaction } from "./db.ts";

export type Roast = "light" | "medium" | "dark";

export type CatalogErrorCode = "not_found" | "conflict" | "invalid";

export class CatalogError extends Error {
  readonly code: CatalogErrorCode;

  constructor(code: CatalogErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export type Market = {
  code: string;
  name: string;
  currency: string;
  minorUnit: number;
};

export type Sku = {
  code: string;
  family: string;
  name: string;
  roast: Roast;
  weightG: number;
  origin: string;
  discontinuedOn: string | null;
};

export type ListedSku = Sku & {
  market: string;
  launchedOn: string;
  amountMinor: number | null;
};

export type Price = {
  market: string;
  amountMinor: number;
  validFrom: string;
  validTo: string | null;
};

export type CatalogEvent = {
  kind: "launch" | "price_change" | "discontinue";
  market: string | null;
  occurredOn: string;
  detail: string;
};

type SkuRow = { id: number; discontinued_on: string | null };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function assertDate(value: string, field: string): void {
  if (!isIsoDate(value)) {
    throw new CatalogError("invalid", `${field} must be a date like 2026-10-01`);
  }
}

function assertAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new CatalogError("invalid", "amountMinor must be a non-negative integer");
  }
}

function isOverlapError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("price_overlap");
}

function findSku(db: Db, code: string): SkuRow {
  const row = db.prepare("SELECT id, discontinued_on FROM skus WHERE code = ?").get(code) as
    | SkuRow
    | undefined;
  if (!row) throw new CatalogError("not_found", `SKU ${code} does not exist`);
  return row;
}

function assertMarket(db: Db, market: string): void {
  const row = db.prepare("SELECT 1 FROM markets WHERE code = ?").get(market);
  if (!row) throw new CatalogError("not_found", `Market ${market} does not exist`);
}

function recordEvent(
  db: Db,
  skuId: number,
  kind: CatalogEvent["kind"],
  market: string | null,
  occurredOn: string,
  detail: string,
): void {
  db.prepare(
    "INSERT INTO events (sku_id, market_code, kind, occurred_on, detail) VALUES (?, ?, ?, ?, ?)",
  ).run(skuId, market, kind, occurredOn, detail);
}

export function addMarket(db: Db, market: Market): void {
  db.prepare("INSERT INTO markets (code, name, currency, minor_unit) VALUES (?, ?, ?, ?)").run(
    market.code,
    market.name,
    market.currency,
    market.minorUnit,
  );
}

export function listMarkets(db: Db): Market[] {
  return db
    .prepare("SELECT code, name, currency, minor_unit AS minorUnit FROM markets ORDER BY code")
    .all() as Market[];
}

export function addFamily(db: Db, name: string): void {
  try {
    db.prepare("INSERT INTO families (name) VALUES (?)").run(name);
  } catch {
    throw new CatalogError("conflict", `Family ${name} already exists`);
  }
}

export type NewSku = {
  code: string;
  family: string;
  name: string;
  roast: Roast;
  weightG: number;
  origin: string;
};

export function addSku(db: Db, sku: NewSku): void {
  const family = db.prepare("SELECT id FROM families WHERE name = ?").get(sku.family) as
    | { id: number }
    | undefined;
  if (!family) throw new CatalogError("not_found", `Family ${sku.family} does not exist`);
  if (db.prepare("SELECT 1 FROM skus WHERE code = ?").get(sku.code)) {
    throw new CatalogError("conflict", `SKU ${sku.code} already exists`);
  }
  db.prepare(
    "INSERT INTO skus (family_id, code, name, roast, weight_g, origin) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(family.id, sku.code, sku.name, sku.roast, sku.weightG, sku.origin);
}

export type Launch = { sku: string; market: string; on: string; amountMinor: number };

export function launch(db: Db, input: Launch): void {
  assertDate(input.on, "on");
  assertAmount(input.amountMinor);
  transaction(db, () => {
    const sku = findSku(db, input.sku);
    assertMarket(db, input.market);
    if (sku.discontinued_on !== null) {
      throw new CatalogError("conflict", `SKU ${input.sku} is discontinued`);
    }
    const listed = db
      .prepare("SELECT 1 FROM listings WHERE sku_id = ? AND market_code = ?")
      .get(sku.id, input.market);
    if (listed) {
      throw new CatalogError("conflict", `SKU ${input.sku} already sells in ${input.market}`);
    }
    db.prepare("INSERT INTO listings (sku_id, market_code, launched_on) VALUES (?, ?, ?)").run(
      sku.id,
      input.market,
      input.on,
    );
    db.prepare(
      "INSERT INTO prices (sku_id, market_code, amount_minor, valid_from) VALUES (?, ?, ?, ?)",
    ).run(sku.id, input.market, input.amountMinor, input.on);
    recordEvent(db, sku.id, "launch", input.market, input.on, `Launched at ${input.amountMinor}`);
  });
}

export type PriceChange = { sku: string; market: string; from: string; amountMinor: number };

// A new price closes the open-ended price that started before it, so the old price
// stays on record with an end date instead of being overwritten.
export function changePrice(db: Db, input: PriceChange): void {
  assertDate(input.from, "from");
  assertAmount(input.amountMinor);
  try {
    transaction(db, () => {
      const sku = findSku(db, input.sku);
      if (sku.discontinued_on !== null) {
        throw new CatalogError("conflict", `SKU ${input.sku} is discontinued`);
      }
      const listed = db
        .prepare("SELECT launched_on FROM listings WHERE sku_id = ? AND market_code = ?")
        .get(sku.id, input.market) as { launched_on: string } | undefined;
      if (!listed) {
        throw new CatalogError("not_found", `SKU ${input.sku} does not sell in ${input.market}`);
      }
      db.prepare(
        `UPDATE prices SET valid_to = ?
         WHERE sku_id = ? AND market_code = ? AND valid_to IS NULL AND valid_from < ?`,
      ).run(input.from, sku.id, input.market, input.from);
      db.prepare(
        "INSERT INTO prices (sku_id, market_code, amount_minor, valid_from) VALUES (?, ?, ?, ?)",
      ).run(sku.id, input.market, input.amountMinor, input.from);
      recordEvent(
        db,
        sku.id,
        "price_change",
        input.market,
        input.from,
        `New price ${input.amountMinor}`,
      );
    });
  } catch (error) {
    if (isOverlapError(error)) {
      throw new CatalogError(
        "conflict",
        `SKU ${input.sku} already has a price in ${input.market} from ${input.from}`,
      );
    }
    throw error;
  }
}

export type Discontinue = { sku: string; on: string };

export function discontinue(db: Db, input: Discontinue): void {
  assertDate(input.on, "on");
  transaction(db, () => {
    const sku = findSku(db, input.sku);
    if (sku.discontinued_on !== null) {
      throw new CatalogError("conflict", `SKU ${input.sku} is already discontinued`);
    }
    const later = db
      .prepare("SELECT 1 FROM prices WHERE sku_id = ? AND valid_from >= ?")
      .get(sku.id, input.on);
    if (later) {
      throw new CatalogError(
        "conflict",
        `SKU ${input.sku} has a price that starts on or after ${input.on}`,
      );
    }
    db.prepare("UPDATE skus SET discontinued_on = ? WHERE id = ?").run(input.on, sku.id);
    db.prepare("UPDATE prices SET valid_to = ? WHERE sku_id = ? AND valid_to IS NULL").run(
      input.on,
      sku.id,
    );
    recordEvent(db, sku.id, "discontinue", null, input.on, "Discontinued");
  });
}

export type ListQuery = { market: string; on: string };

export function listSkus(db: Db, query: ListQuery): ListedSku[] {
  assertDate(query.on, "on");
  assertMarket(db, query.market);
  return db
    .prepare(
      `SELECT s.code, f.name AS family, s.name, s.roast, s.weight_g AS weightG, s.origin,
              s.discontinued_on AS discontinuedOn, l.market_code AS market,
              l.launched_on AS launchedOn, p.amount_minor AS amountMinor
       FROM listings l
       JOIN skus s ON s.id = l.sku_id
       JOIN families f ON f.id = s.family_id
       LEFT JOIN prices p
         ON p.sku_id = l.sku_id AND p.market_code = l.market_code
        AND p.valid_from <= ?1 AND (p.valid_to IS NULL OR p.valid_to > ?1)
       WHERE l.market_code = ?2
         AND l.launched_on <= ?1
         AND (s.discontinued_on IS NULL OR s.discontinued_on > ?1)
       ORDER BY f.name, s.code`,
    )
    .all(query.on, query.market) as ListedSku[];
}

export type PriceQuery = { sku: string; market: string; on: string };

export function priceOn(db: Db, query: PriceQuery): number | null {
  assertDate(query.on, "on");
  const sku = findSku(db, query.sku);
  const row = db
    .prepare(
      `SELECT amount_minor AS amountMinor FROM prices
       WHERE sku_id = ?1 AND market_code = ?2
         AND valid_from <= ?3 AND (valid_to IS NULL OR valid_to > ?3)`,
    )
    .get(sku.id, query.market, query.on) as { amountMinor: number } | undefined;
  return row?.amountMinor ?? null;
}

export function priceHistory(db: Db, skuCode: string): Price[] {
  const sku = findSku(db, skuCode);
  return db
    .prepare(
      `SELECT market_code AS market, amount_minor AS amountMinor,
              valid_from AS validFrom, valid_to AS validTo
       FROM prices WHERE sku_id = ? ORDER BY market_code, valid_from`,
    )
    .all(sku.id) as Price[];
}

export function eventsFor(db: Db, skuCode: string): CatalogEvent[] {
  const sku = findSku(db, skuCode);
  return db
    .prepare(
      `SELECT kind, market_code AS market, occurred_on AS occurredOn, detail
       FROM events WHERE sku_id = ? ORDER BY occurred_on, id`,
    )
    .all(sku.id) as CatalogEvent[];
}
