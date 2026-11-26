import { describe, expect, test } from "vitest";
import { formatMoney, parseMoney } from "./money.ts";

const JPY = { currency: "JPY", minorUnit: 0 };
const EUR = { currency: "EUR", minorUnit: 2 };

describe("formatMoney", () => {
  test("formats yen without decimals", () => {
    expect(formatMoney(1480, JPY)).toMatch(/1,480/);
  });

  test("formats euros in the Spanish style", () => {
    expect(formatMoney(990, EUR)).toMatch(/9,90/);
    expect(formatMoney(990, EUR)).toContain("€");
  });

  test("uses a neutral locale for a currency without a home market", () => {
    expect(formatMoney(1250, { currency: "USD", minorUnit: 2 })).toBe("US$12.50");
  });
});

describe("parseMoney", () => {
  test("reads yen as whole numbers", () => {
    expect(parseMoney("1680", 0)).toBe(1680);
    expect(parseMoney("16.80", 0)).toBeNull();
  });

  test("reads euros with a dot or a comma", () => {
    expect(parseMoney("9.90", 2)).toBe(990);
    expect(parseMoney("9,9", 2)).toBe(990);
    expect(parseMoney("12", 2)).toBe(1200);
  });

  test("rejects anything else", () => {
    expect(parseMoney("", 2)).toBeNull();
    expect(parseMoney("-1", 2)).toBeNull();
    expect(parseMoney("9.999", 2)).toBeNull();
    expect(parseMoney("abc", 0)).toBeNull();
  });
});
