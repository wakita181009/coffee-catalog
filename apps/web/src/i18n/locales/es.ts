import type { Messages } from "./en.ts";

export const es: Messages = {
  app: {
    eyebrow: "Gestión del tostadero",
    title: "Catálogo de café",
    market: "Mercado",
    pricesOn: "Precios a fecha de",
    language: "Idioma",
  },
  table: {
    sku: "SKU",
    roast: "Tueste",
    origin: "Origen",
    price: "Precio",
    empty: "No hay nada a la venta en {{market}} en esta fecha.",
  },
  roast: {
    light: "Claro",
    medium: "Medio",
    dark: "Oscuro",
  },
  detail: {
    label: "Detalles de {{code}}",
    close: "Cerrar detalles",
    priceHistory: "Historial de precios",
    now: "actualidad",
    newPrice: "Nuevo precio en {{market}}",
    from: "Desde",
    price: "Precio ({{currency}})",
    setPrice: "Fijar precio",
    discontinue: "Descatalogar",
    discontinueOn: "Desde",
    discontinueAction: "Descatalogar",
    events: "Eventos",
  },
  event: {
    launch: "Lanzamiento",
    price_change: "Cambio de precio",
    discontinue: "Descatalogado",
    launchedAt: "Lanzado a {{amount}}",
    newPrice: "Nuevo precio: {{amount}}",
    discontinued: "Ya no se vende",
  },
  message: {
    enterPrice: "Introduce un precio en {{currency}}",
    priceSet: "Nuevo precio en {{market}} desde el {{date}}",
    discontinuedFrom: "Descatalogado desde el {{date}}",
  },
};
