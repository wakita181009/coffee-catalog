// Dates are ISO `YYYY-MM-DD` strings, so text comparison is date comparison.
// Price ranges are half-open: [valid_from, valid_to). A NULL valid_to means "until further notice".
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS families (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS skus (
  id              INTEGER PRIMARY KEY,
  family_id       INTEGER NOT NULL REFERENCES families(id),
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  roast           TEXT NOT NULL CHECK (roast IN ('light', 'medium', 'dark')),
  weight_g        INTEGER NOT NULL CHECK (weight_g > 0),
  origin          TEXT NOT NULL,
  discontinued_on TEXT
);

CREATE TABLE IF NOT EXISTS markets (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  currency   TEXT NOT NULL,
  minor_unit INTEGER NOT NULL CHECK (minor_unit >= 0)
);

CREATE TABLE IF NOT EXISTS listings (
  sku_id      INTEGER NOT NULL REFERENCES skus(id),
  market_code TEXT NOT NULL REFERENCES markets(code),
  launched_on TEXT NOT NULL,
  PRIMARY KEY (sku_id, market_code)
);

CREATE TABLE IF NOT EXISTS prices (
  id           INTEGER PRIMARY KEY,
  sku_id       INTEGER NOT NULL,
  market_code  TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  valid_from   TEXT NOT NULL,
  valid_to     TEXT CHECK (valid_to IS NULL OR valid_to > valid_from),
  FOREIGN KEY (sku_id, market_code) REFERENCES listings(sku_id, market_code)
);

CREATE INDEX IF NOT EXISTS prices_lookup ON prices (sku_id, market_code, valid_from);

-- SQLite has no exclusion constraints, so overlap is guarded here as well as in the app.
-- Any write path that skips the app code still cannot store two prices for one day.
CREATE TRIGGER IF NOT EXISTS prices_no_overlap_insert
BEFORE INSERT ON prices
WHEN EXISTS (
  SELECT 1 FROM prices p
  WHERE p.sku_id = NEW.sku_id
    AND p.market_code = NEW.market_code
    AND p.valid_from < COALESCE(NEW.valid_to, '9999-12-31')
    AND COALESCE(p.valid_to, '9999-12-31') > NEW.valid_from
)
BEGIN
  SELECT RAISE(ABORT, 'price_overlap');
END;

CREATE TRIGGER IF NOT EXISTS prices_no_overlap_update
BEFORE UPDATE ON prices
WHEN EXISTS (
  SELECT 1 FROM prices p
  WHERE p.id <> NEW.id
    AND p.sku_id = NEW.sku_id
    AND p.market_code = NEW.market_code
    AND p.valid_from < COALESCE(NEW.valid_to, '9999-12-31')
    AND COALESCE(p.valid_to, '9999-12-31') > NEW.valid_from
)
BEGIN
  SELECT RAISE(ABORT, 'price_overlap');
END;

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY,
  sku_id      INTEGER NOT NULL REFERENCES skus(id),
  market_code TEXT REFERENCES markets(code),
  kind        TEXT NOT NULL CHECK (kind IN ('launch', 'price_change', 'discontinue')),
  occurred_on TEXT NOT NULL,
  detail      TEXT NOT NULL
);
`;
