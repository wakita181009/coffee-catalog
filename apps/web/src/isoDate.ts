// The API speaks in "YYYY-MM-DD" strings while DayPicker works with Dates at local midnight.
// Converting through local fields (not toISOString) keeps the picked day from shifting
// across the UTC boundary.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isoToLocalDate(iso: string): Date | undefined {
  const match = ISO_DATE.exec(iso);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  // Rejects overflowed inputs such as "2026-02-30", which Date silently rolls into March.
  return date.getMonth() === m - 1 && date.getDate() === d ? date : undefined;
}

export function localDateToIso(date: Date): string {
  const y = String(date.getFullYear()).padStart(4, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
