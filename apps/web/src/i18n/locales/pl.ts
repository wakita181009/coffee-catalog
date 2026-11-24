import type { Messages } from "./en.ts";

// Polish declines country names, so sentences put {{market}} where the nominative fits.
export const pl: Messages = {
  app: {
    eyebrow: "Zaplecze palarni",
    title: "Katalog kawy",
    market: "Rynek",
    pricesOn: "Ceny na dzień",
    language: "Język",
  },
  table: {
    sku: "SKU",
    roast: "Palenie",
    origin: "Pochodzenie",
    price: "Cena",
    empty: "{{market}}: brak produktów w sprzedaży w tym dniu.",
  },
  roast: {
    light: "Jasne",
    medium: "Średnie",
    dark: "Ciemne",
  },
  detail: {
    label: "Szczegóły {{code}}",
    close: "Zamknij szczegóły",
    priceHistory: "Historia cen",
    now: "obecnie",
    newPrice: "Nowa cena – {{market}}",
    from: "Od",
    price: "Cena ({{currency}})",
    setPrice: "Ustaw cenę",
    discontinue: "Wycofanie z oferty",
    discontinueOn: "Od dnia",
    discontinueAction: "Wycofaj",
    events: "Zdarzenia",
  },
  event: {
    launch: "Wprowadzenie",
    price_change: "Zmiana ceny",
    discontinue: "Wycofanie",
    launchedAt: "Wprowadzono w cenie {{amount}}",
    newPrice: "Nowa cena {{amount}}",
    discontinued: "Wycofano z oferty",
  },
  message: {
    enterPrice: "Podaj cenę w {{currency}}",
    priceSet: "Nowa cena ({{market}}) od {{date}}",
    discontinuedFrom: "Wycofano z oferty od {{date}}",
  },
};
