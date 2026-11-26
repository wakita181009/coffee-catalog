import type { ListedSku } from "@coffee-catalog/api/catalog";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { serveApi } from "../test/api.ts";
import { client, unwrap } from "./api.ts";
import { NewSkuForm } from "./NewSkuForm.tsx";

const JP = { code: "JP", name: "Japan", currency: "JPY", minorUnit: 0 };
const ES = { code: "ES", name: "Spain", currency: "EUR", minorUnit: 2 };

function renderForm() {
  const handlers = { onCreated: vi.fn(), onClose: vi.fn() };
  render(<NewSkuForm markets={[ES, JP]} market={JP} on="2026-11-26" {...handlers} />);
  return handlers;
}

async function fillSku({ code = "DC-250-M", weight = "250", amount = "1600" } = {}) {
  const codeInput = screen.getByLabelText("Code");
  await userEvent.clear(codeInput);
  await userEvent.type(codeInput, code);
  await userEvent.type(screen.getByLabelText("Name"), "Decaf 250 g, medium roast");
  await userEvent.type(screen.getByLabelText("Origin"), "Mexico");
  await userEvent.type(screen.getByLabelText("Weight (g)"), weight);
  await userEvent.type(screen.getByLabelText(/^Price/), amount);
}

async function choose(field: string, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name: field }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Create and launch" }));

function listed(market: string, on: string): Promise<ListedSku[]> {
  return unwrap(client.api.skus.$get({ query: { market, on } }));
}

describe("NewSkuForm", () => {
  test("creates a SKU in an existing family and launches it", async () => {
    serveApi();
    const { onCreated } = renderForm();
    expect(await screen.findByRole("combobox", { name: "Family" })).toHaveTextContent(
      "Morning Blend",
    );

    await fillSku();
    await userEvent.click(screen.getByRole("button", { name: "Dark" }));
    await submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("DC-250-M"));
    const sku = (await listed("JP", "2026-11-26")).find((s) => s.code === "DC-250-M");
    expect(sku).toMatchObject({
      family: "Morning Blend",
      roast: "dark",
      weightG: 250,
      origin: "Mexico",
      launchedOn: "2026-11-26",
      amountMinor: 1600,
    });
  });

  test("creates a new family and launches in the chosen market", async () => {
    serveApi();
    const { onCreated } = renderForm();
    await screen.findByRole("combobox", { name: "Family" });

    await choose("Family", "New family");
    await userEvent.type(screen.getByLabelText("Family name"), "Decaf");
    await choose("Market", "Spain");
    await fillSku({ amount: "9,50" });
    await submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("DC-250-M"));
    expect(await unwrap(client.api.families.$get())).toContain("Decaf");
    const sku = (await listed("ES", "2026-11-26")).find((s) => s.code === "DC-250-M");
    expect(sku).toMatchObject({ family: "Decaf", amountMinor: 950 });
  });

  test("keeps the new family after a failed step so a retry does not create it twice", async () => {
    serveApi();
    const { onCreated } = renderForm();
    await screen.findByRole("combobox", { name: "Family" });

    await choose("Family", "New family");
    await userEvent.type(screen.getByLabelText("Family name"), "Decaf");
    await fillSku({ code: "MB-250-M" });
    await submit();

    expect(await screen.findByRole("status")).toHaveTextContent("SKU MB-250-M already exists");
    expect(screen.getByRole("combobox", { name: "Family" })).toHaveTextContent("Decaf");
    expect(onCreated).not.toHaveBeenCalled();

    const code = screen.getByLabelText("Code");
    await userEvent.clear(code);
    await userEvent.type(code, "DC-250-M");
    await submit();

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("DC-250-M"));
  });

  test("rejects a weight that is not whole grams without calling the API", async () => {
    const fetch = serveApi();
    const { onCreated } = renderForm();
    await screen.findByRole("combobox", { name: "Family" });
    const calls = fetch.mock.calls.length;

    await fillSku({ weight: "2.5" });
    await submit();

    expect(screen.getByRole("status")).toHaveTextContent("Enter the weight in whole grams");
    expect(fetch.mock.calls.length).toBe(calls);
    expect(onCreated).not.toHaveBeenCalled();
  });

  test("rejects a price the launch market's currency cannot hold", async () => {
    const fetch = serveApi();
    renderForm();
    await screen.findByRole("combobox", { name: "Family" });
    const calls = fetch.mock.calls.length;

    await fillSku({ amount: "16.50" });
    await submit();

    expect(screen.getByRole("status")).toHaveTextContent("Enter a price in JPY");
    expect(fetch.mock.calls.length).toBe(calls);
  });

  test("offers only a new family when none exist yet", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
    renderForm();

    expect(await screen.findByLabelText("Family name")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Family" })).toHaveTextContent("New family");
  });

  test("shows the API error when families cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "internal", message: "Something went wrong" }, { status: 500 }),
    );
    renderForm();

    expect(await screen.findByRole("status")).toHaveTextContent("Something went wrong");
  });

  test("closes", async () => {
    serveApi();
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Close new SKU form" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
