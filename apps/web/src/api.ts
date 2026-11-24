import type { AppType } from "@coffee-catalog/api";
import { hc } from "hono/client";

export const client = hc<AppType>("/");

type JsonResponse = { ok: boolean; status: number; json(): Promise<unknown> };

// Turns any non-2xx answer into an Error carrying the API's `message`,
// so components only handle the success shape.
export async function unwrap<R extends JsonResponse>(
  request: Promise<R>,
): Promise<Awaited<ReturnType<Extract<R, { ok: true }>["json"]>>> {
  const res = await request;
  const body = (await res.json()) as { message?: string };
  if (!res.ok) throw new Error(body.message ?? `Request failed with ${res.status}`);
  return body as Awaited<ReturnType<Extract<R, { ok: true }>["json"]>>;
}
