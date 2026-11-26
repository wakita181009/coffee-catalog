import { describe, expect, test } from "vitest";
import { formatAmountInput, formatMoney, parseMoney } from "./money.ts";

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

  test("reads euros with a decimal point", () => {
    expect(parseMoney("9.90", 2)).toBe(990);
    expect(parseMoney("9.9", 2)).toBe(990);
    expect(parseMoney("12", 2)).toBe(1200);
  });

  test("ignores thousands separators", () => {
    expect(parseMoney("1,680", 0)).toBe(1680);
    expect(parseMoney("1,234.50", 2)).toBe(123450);
  });

  test("rejects anything else", () => {
    expect(parseMoney("", 2)).toBeNull();
    expect(parseMoney("-1", 2)).toBeNull();
    expect(parseMoney("9.999", 2)).toBeNull();
    expect(parseMoney("abc", 0)).toBeNull();
  });
});

describe("formatAmountInput", () => {
  test("keeps only digits for yen and groups them in threes", () => {
    expect(formatAmountInput("1234567", 0)).toBe("1,234,567");
    expect(formatAmountInput("1a2.3-4", 0)).toBe("1,234");
    expect(formatAmountInput("", 0)).toBe("");
  });

  test("drops leading zeros", () => {
    expect(formatAmountInput("001480", 0)).toBe("1,480");
    expect(formatAmountInput("0", 0)).toBe("0");
  });

  test("allows one decimal point up to the currency's minor units", () => {
    expect(formatAmountInput("1234.5", 2)).toBe("1,234.5");
    expect(formatAmountInput("9.999", 2)).toBe("9.99");
    expect(formatAmountInput("1.2.3", 2)).toBe("1.23");
    expect(formatAmountInput(".5", 2)).toBe("0.5");
    expect(formatAmountInput("12.", 2)).toBe("12.");
  });

  test("re-groups a value that already has commas", () => {
    expect(formatAmountInput("1,2345", 0)).toBe("12,345");
  });
});
