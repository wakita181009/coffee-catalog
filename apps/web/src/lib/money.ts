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

// Parses what a person types ("1,480", "9.90") into minor units, or null.
// Commas are thousands separators, matching what formatAmountInput produces.
export function parseMoney(input: string, minorUnit: number): number | null {
  const normalized = input.trim().replaceAll(",", "");
  const pattern = minorUnit === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${minorUnit}})?$`);
  if (!pattern.test(normalized)) return null;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return Number(whole) * 10 ** minorUnit + Number(fraction.padEnd(minorUnit, "0") || "0");
}

// Keeps only digits (and one decimal point when the currency has minor units),
// then groups the whole part in threes: "1234567.891" -> "1,234,567.89".
export function formatAmountInput(input: string, minorUnit: number): string {
  const allowed = input.replace(minorUnit === 0 ? /[^\d]/g : /[^\d.]/g, "");
  const dot = allowed.indexOf(".");
  const wholeDigits = dot === -1 ? allowed : allowed.slice(0, dot);
  const whole = wholeDigits.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (dot === -1) return whole;
  const fraction = allowed
    .slice(dot + 1)
    .replaceAll(".", "")
    .slice(0, minorUnit);
  return `${whole || "0"}.${fraction}`;
}
