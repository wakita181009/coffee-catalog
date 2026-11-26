import { describe, expect, test } from "vitest";
import { isoToLocalDate, localDateToIso } from "./isoDate.ts";

describe("isoToLocalDate", () => {
  test("returns local midnight of the given day", () => {
    const date = isoToLocalDate("2026-10-01");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(1);
    expect(date?.getHours()).toBe(0);
  });

  test("returns undefined for malformed or impossible dates", () => {
    expect(isoToLocalDate("")).toBeUndefined();
    expect(isoToLocalDate("2026-1-01")).toBeUndefined();
    expect(isoToLocalDate("2026-02-30")).toBeUndefined();
    expect(isoToLocalDate("2026-13-01")).toBeUndefined();
  });
});

describe("localDateToIso", () => {
  test("formats from local fields with zero padding", () => {
    expect(localDateToIso(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  test("round-trips with isoToLocalDate", () => {
    const date = isoToLocalDate("2024-02-29");
    expect(date && localDateToIso(date)).toBe("2024-02-29");
  });
});
