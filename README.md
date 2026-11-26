# Coffee Catalog

> **Note:** This is a sample React and Node.js project. The roastery, products and prices are made up, and it is not meant for production use.

Back office for a coffee roastery that sells the same SKUs in several countries. It tracks which SKU sells in which market, what it cost on any given day, and when it was discontinued.

## Done when

Each line has a test in [`apps/api/test/done-when.test.ts`](apps/api/test/done-when.test.ts).

- One SKU sells in Japan and Spain at different prices.
- The price on September 1 is the price before the October 1 increase.
- A discontinued SKU is gone from the list, but its past prices are still there.
- Two prices for the same market and the same dates are rejected.

## Layout

```
apps/
  api/   Hono API on Node's built-in SQLite (node:sqlite)
  web/   React + Vite UI, built with shadcn/ui and Tailwind CSS v4, in English, Spanish, Japanese and Polish
```

The web app calls the API through Hono's typed client (`hono/client`), so request and response types come straight from `apps/api/src/app.ts`.

## Getting started

Requires [mise](https://mise.jdx.dev/), which provides Node 24 and pnpm.

```sh
mise install
pnpm install   # also installs the husky git hooks
pnpm dev       # API on :8787, web on :5173 (proxies /api to the API)
```

On first start the API creates `apps/api/data/coffee.db` and seeds sample data (three SKUs, Japan and Spain). Delete the file to start over.

| Variable  | Default          | Used by |
| --------- | ---------------- | ------- |
| `DB_PATH` | `data/coffee.db` | API     |
| `PORT`    | `8787`           | API     |

## Scripts

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Run API and web in watch mode   |
| `pnpm build`     | Production build of the web app |
| `pnpm test`      | Vitest in every workspace       |
| `pnpm typecheck` | `tsc` in every workspace        |
| `pnpm lint`      | Biome lint and format check     |
| `pnpm format`    | Biome with fixes applied        |

The husky pre-commit hook runs `lint`, `typecheck` and `test`. CI runs the same checks plus `build`.

## Data model

- **Market**: a country with its currency and minor unit (JP / JPY / 0, ES / EUR / 2).
- **SKU**: one sellable product (family, roast, weight, origin). It can be discontinued from a date.
- **Listing**: a SKU launched in a market on a date.
- **Price**: an amount in minor units (yen, cents) valid over a half-open range `[valid_from, valid_to)`. `valid_to = NULL` means "until further notice".
- **Event**: an append-only log of launches, price changes and discontinuations.

Rules:

- Dates are ISO `YYYY-MM-DD` strings, so string comparison is date comparison.
- A new price closes the open price for that market the day it starts. Past prices are never edited.
- Price ranges for one SKU in one market never overlap. The app checks this, and SQLite triggers reject overlapping rows even if a write skips the app.
- Discontinuing closes every open price on that date and removes the SKU from the list from then on. Its price history stays.

## API

All errors return `{ "error": "invalid" | "not_found" | "conflict" | "internal", "message": string }` with status 400, 404, 409 or 500.

| Method | Path                          | Body / query                                     |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/api/markets`                |                                                  |
| GET    | `/api/skus`                   | `?market=JP&on=2026-10-01`                       |
| POST   | `/api/families`               | `{ name }`                                       |
| POST   | `/api/skus`                   | `{ code, family, name, roast, weightG, origin }` |
| POST   | `/api/skus/:code/launches`    | `{ market, on, amountMinor }`                    |
| POST   | `/api/skus/:code/prices`      | `{ market, from, amountMinor }`                  |
| POST   | `/api/skus/:code/discontinue` | `{ on }`                                         |
| GET    | `/api/skus/:code/price`       | `?market=JP&on=2026-10-01`                       |
| GET    | `/api/skus/:code/prices`      | Full price history                               |
| GET    | `/api/skus/:code/events`      | Event log                                        |

## Translations

The UI is in English, Spanish, Japanese and Polish ([react-i18next](https://react.i18next.com/)). The language is picked from `localStorage`, then the browser, and falls back to English. People can switch it in the header.

- Messages live in `apps/web/src/i18n/locales/{en,es,ja,pl}.ts`. English is the source; the other files are typed against it, so a missing key fails `pnpm typecheck`.
- `apps/web/src/i18n/locales.test.ts` also checks that every locale has the same `{{placeholders}}` as English.
- Dates and market names follow the UI language (`Intl.DateTimeFormat`, `Intl.DisplayNames`). Prices keep the market's own currency format, since that is what customers there see.
- Product data (SKU names, origins) and API error messages are not translated.

To add a language, copy `en.ts`, translate it, and register it in `LANGUAGES` and `resources` in `apps/web/src/i18n/index.ts`.

## Adding UI components

The web app uses [shadcn/ui](https://ui.shadcn.com/) (Radix, Nova preset). Components live in `apps/web/src/components/ui` and are owned by this repo. Add more with:

```sh
cd apps/web
pnpm dlx shadcn@latest add <component>
```

Theme tokens (a warm roastery palette) are CSS variables in `apps/web/src/styles.css`.
