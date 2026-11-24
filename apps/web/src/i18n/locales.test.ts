import { describe, expect, test } from "vitest";
import { en } from "./locales/en.ts";
import { ja } from "./locales/ja.ts";
import { pl } from "./locales/pl.ts";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.fromEntries(
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === "string"
        ? [[`${prefix}${key}`, value]]
        : Object.entries(flatten(value, `${prefix}${key}.`)),
    ),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? "").sort();
}

const source = flatten(en);

describe.each([
  ["ja", ja],
  ["pl", pl],
])("%s locale", (_, locale) => {
  const messages = flatten(locale);

  test("has exactly the English keys", () => {
    expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort());
  });

  test("has no empty messages", () => {
    expect(Object.entries(messages).filter(([, text]) => text.trim() === "")).toEqual([]);
  });

  test("uses the same placeholders as English", () => {
    for (const [key, text] of Object.entries(source)) {
      expect(placeholders(messages[key] ?? ""), key).toEqual(placeholders(text));
    }
  });
});
