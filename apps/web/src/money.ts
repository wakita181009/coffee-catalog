export type Currency = { currency: string; minorUnit: number };

const LOCALE: Record<string, string> = { JPY: "ja-JP", EUR: "es-ES" };

export function formatMoney(amountMinor: number, { currency, minorUnit }: Currency): string {
  return new Intl.NumberFormat(LOCALE[currency] ?? "en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  }).format(amountMinor / 10 ** minorUnit);
}

// Parses what a person types ("9.90", "9,90", "1480") into minor units, or null.
export function parseMoney(input: string, minorUnit: number): number | null {
  const normalized = input.trim().replace(",", ".");
  const pattern = minorUnit === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${minorUnit}})?$`);
  if (!pattern.test(normalized)) return null;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return Number(whole) * 10 ** minorUnit + Number(fraction.padEnd(minorUnit, "0") || "0");
}
