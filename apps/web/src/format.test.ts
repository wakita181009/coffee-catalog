import { describe, expect, test } from "vitest";
import { formatDate, marketName } from "./format.ts";

describe("formatDate", () => {
  test("keeps the calendar day whatever the local time zone", () => {
    expect(formatDate("2026-10-01", "en")).toBe("Oct 1, 2026");
  });

  test("follows the UI language", () => {
    expect(formatDate("2026-10-01", "ja")).toBe("2026/10/01");
    expect(formatDate("2026-10-01", "pl")).toBe("1 paź 2026");
  });
});

describe("marketName", () => {
  test("names the market in the UI language", () => {
    expect(marketName("JP", "en", "Japan")).toBe("Japan");
    expect(marketName("JP", "ja", "Japan")).toBe("日本");
    expect(marketName("ES", "pl", "Spain")).toBe("Hiszpania");
  });

  test("falls back to the stored name for an unknown code", () => {
    expect(marketName("not-a-region", "en", "Somewhere")).toBe("Somewhere");
  });
});
