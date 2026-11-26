import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { ValidationTargets } from "hono/types";
import { z } from "zod";
import {
  addFamily,
  addSku,
  CatalogError,
  type CatalogErrorCode,
  changePrice,
  discontinue,
  eventsFor,
  isIsoDate,
  launch,
  listFamilies,
  listMarkets,
  listSkus,
  priceHistory,
  priceOn,
} from "./catalog.ts";
import type { Db } from "./db.ts";

const isoDate = z.string().refine(isIsoDate, "Use a date like 2026-10-01");
const marketCode = z.string().regex(/^[A-Z]{2}$/, "Use a two-letter market code like JP");
const amountMinor = z.number().int().nonnegative();

// Without a hook, zValidator answers 400 with the raw Zod result, a different shape
// from every other error. One shape lets clients read `message` the same way everywhere.
function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return c.json({ error: "invalid", message }, 400);
    }
  });
}

const STATUS: Record<CatalogErrorCode, 400 | 404 | 409> = {
  invalid: 400,
  not_found: 404,
  conflict: 409,
};

export function createApp(db: Db) {
  return new Hono()
    .onError((error, c) => {
      if (error instanceof CatalogError) {
        return c.json({ error: error.code, message: error.message }, STATUS[error.code]);
      }
      console.error(error);
      return c.json({ error: "internal", message: "Something went wrong" }, 500);
    })
    .get("/api/markets", (c) => c.json(listMarkets(db)))
    .get("/api/skus", validate("query", z.object({ market: marketCode, on: isoDate })), (c) =>
      c.json(listSkus(db, c.req.valid("query"))),
    )
    .get("/api/families", (c) => c.json(listFamilies(db)))
    .post("/api/families", validate("json", z.object({ name: z.string().min(1) })), (c) => {
      addFamily(db, c.req.valid("json").name);
      return c.json({ ok: true }, 201);
    })
    .post(
      "/api/skus",
      validate(
        "json",
        z.object({
          code: z.string().min(1),
          family: z.string().min(1),
          name: z.string().min(1),
          roast: z.enum(["light", "medium", "dark"]),
          weightG: z.number().int().positive(),
          origin: z.string().min(1),
        }),
      ),
      (c) => {
        addSku(db, c.req.valid("json"));
        return c.json({ ok: true }, 201);
      },
    )
    .post(
      "/api/skus/:code/launches",
      validate("json", z.object({ market: marketCode, on: isoDate, amountMinor })),
      (c) => {
        launch(db, { sku: c.req.param("code"), ...c.req.valid("json") });
        return c.json({ ok: true }, 201);
      },
    )
    .post(
      "/api/skus/:code/prices",
      validate("json", z.object({ market: marketCode, from: isoDate, amountMinor })),
      (c) => {
        changePrice(db, { sku: c.req.param("code"), ...c.req.valid("json") });
        return c.json({ ok: true }, 201);
      },
    )
    .post("/api/skus/:code/discontinue", validate("json", z.object({ on: isoDate })), (c) => {
      discontinue(db, { sku: c.req.param("code"), ...c.req.valid("json") });
      return c.json({ ok: true });
    })
    .get(
      "/api/skus/:code/price",
      validate("query", z.object({ market: marketCode, on: isoDate })),
      (c) => {
        const amount = priceOn(db, { sku: c.req.param("code"), ...c.req.valid("query") });
        return c.json({ amountMinor: amount });
      },
    )
    .get("/api/skus/:code/prices", (c) => c.json(priceHistory(db, c.req.param("code"))))
    .get("/api/skus/:code/events", (c) => c.json(eventsFor(db, c.req.param("code"))));
}

export type AppType = ReturnType<typeof createApp>;
