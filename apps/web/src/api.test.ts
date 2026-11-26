import { describe, expect, test } from "vitest";
import { unwrap } from "./api.ts";

function response(status: number, body: unknown) {
  return Promise.resolve({
    ok: status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("unwrap", () => {
  test("returns the body of a successful response", async () => {
    await expect(unwrap(response(200, { amountMinor: 990 }))).resolves.toEqual({
      amountMinor: 990,
    });
  });

  test("throws the API's message for an error response", async () => {
    await expect(unwrap(response(409, { message: "Already priced" }))).rejects.toThrow(
      "Already priced",
    );
  });

  test("falls back to the status when the error has no message", async () => {
    await expect(unwrap(response(502, {}))).rejects.toThrow("Request failed with 502");
  });
});
