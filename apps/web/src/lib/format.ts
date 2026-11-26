// UI language decides how dates and country names read; money keeps the market's own
// currency format (see money.ts) because that is what customers in that market see.

export function formatDate(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

// Market codes are ISO 3166 region codes, so Intl can name them in any language.
export function marketName(code: string, lang: string, fallback: string): string {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}
