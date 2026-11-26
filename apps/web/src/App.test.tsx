import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { serveApi } from "../test/api.ts";
import { App } from "./App.tsx";

function today(iso: string) {
  // Only Date is faked so promises and user-event timers keep running.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${iso}T12:00:00Z`));
}

function priceOf(name: RegExp) {
  const row = screen.getByRole("button", { name }).closest("tr") as HTMLElement;
  return within(row).getAllByRole("cell").at(-1)?.textContent;
}

describe("App", () => {
  beforeEach(() => today("2026-09-20"));

  test("lists the SKUs on sale in the chosen market", async () => {
    serveApi();
    render(<App />);

    expect(await screen.findByText("￥1,480")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prices on" })).toHaveAccessibleDescription(
      "Sep 20, 2026",
    );

    await userEvent.click(screen.getByRole("button", { name: "Spain" }));
    expect(await screen.findByText(/8,90/)).toBeInTheDocument();
  });

  test("keeps the market selected when its toggle is clicked again", async () => {
    serveApi();
    render(<App />);
    await screen.findByText("￥1,480");

    await userEvent.click(screen.getByRole("button", { name: "Japan" }));

    expect(screen.getByRole("button", { name: "Japan" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("￥1,480")).toBeInTheDocument();
  });

  test("reloads prices for the picked date", async () => {
    serveApi();
    render(<App />);
    await screen.findByText("￥1,480");

    await userEvent.click(screen.getByRole("button", { name: "Prices on" }));
    await userEvent.click(screen.getByRole("button", { name: /Next Month/i }));
    await userEvent.click(screen.getByRole("button", { name: /October 1st, 2026/ }));

    expect(await screen.findByText("￥1,680")).toBeInTheDocument();
  });

  test("says nothing is on sale before the first launch", async () => {
    today("2025-01-01");
    serveApi();
    render(<App />);

    expect(await screen.findByText("Nothing on sale in Japan on this date.")).toBeInTheDocument();
  });

  test("opens a SKU's details, refreshes the list after a change, and closes them", async () => {
    serveApi();
    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /SO-ETH-200-L/ }));
    const detail = screen.getByRole("complementary", { name: "Details for SO-ETH-200-L" });
    expect(priceOf(/SO-ETH-200-L/)).toBe("￥2,200");

    fireEvent.change(within(detail).getByLabelText("From", { selector: "#discontinue-on" }), {
      target: { value: "2026-09-01" },
    });
    await userEvent.click(within(detail).getByRole("button", { name: "Discontinue" }));

    expect(await within(detail).findByRole("status")).toHaveTextContent("Discontinued from");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /SO-ETH-200-L/ })).not.toBeInTheDocument(),
    );

    await userEvent.click(within(detail).getByRole("button", { name: "Close details" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  test("creates a SKU, lists it, and opens its details", async () => {
    serveApi();
    render(<App />);
    await screen.findByText("￥1,480");

    await userEvent.click(screen.getByRole("button", { name: /MB-250-M/ }));
    await userEvent.click(screen.getByRole("button", { name: "New SKU" }));
    expect(screen.queryByRole("complementary", { name: /Details for/ })).not.toBeInTheDocument();
    const form = screen.getByRole("complementary", { name: "New SKU" });
    await within(form).findByRole("combobox", { name: "Family" });

    await userEvent.type(within(form).getByLabelText("Code"), "DC-250-M");
    await userEvent.type(within(form).getByLabelText("Name"), "Decaf 250 g");
    await userEvent.type(within(form).getByLabelText("Origin"), "Mexico");
    await userEvent.type(within(form).getByLabelText("Weight (g)"), "250");
    await userEvent.type(within(form).getByLabelText("Price (JPY)"), "1600");
    await userEvent.click(within(form).getByRole("button", { name: "Create and launch" }));

    expect(
      await screen.findByRole("complementary", { name: "Details for DC-250-M" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "New SKU" })).not.toBeInTheDocument();
    await waitFor(() => expect(priceOf(/DC-250-M/)).toBe("￥1,600"));
  });

  test("closes the new SKU form, and picking a SKU replaces it", async () => {
    serveApi();
    render(<App />);
    await screen.findByText("￥1,480");

    await userEvent.click(screen.getByRole("button", { name: "New SKU" }));
    await userEvent.click(screen.getByRole("button", { name: "Close new SKU form" }));
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "New SKU" }));
    await userEvent.click(screen.getByRole("button", { name: /MB-250-M/ }));
    expect(screen.getByRole("complementary", { name: "Details for MB-250-M" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "New SKU" })).not.toBeInTheDocument();
  });

  test("shows the API error when markets cannot be loaded", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "internal", message: "Something went wrong" }, { status: 500 }),
    );
    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
