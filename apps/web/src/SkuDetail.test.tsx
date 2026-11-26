import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { serveApi } from "../test/api.ts";
import { SkuDetail } from "./SkuDetail.tsx";

const JP = { code: "JP", name: "Japan", currency: "JPY", minorUnit: 0 };
const ES = { code: "ES", name: "Spain", currency: "EUR", minorUnit: 2 };

function renderDetail(props: Partial<Parameters<typeof SkuDetail>[0]> = {}) {
  const handlers = { onChanged: vi.fn(), onClose: vi.fn() };
  render(<SkuDetail code="MB-250-M" markets={[ES, JP]} market={JP} {...handlers} {...props} />);
  return handlers;
}

function section(title: string) {
  const heading = screen.getByRole("heading", { name: title });
  return within(heading.closest("section") as HTMLElement);
}

const ORDINAL: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
const ordinalRules = new Intl.PluralRules("en", { type: "ordinal" });

// Walks the picker's month/year dropdowns, then clicks the day by its accessible name.
// Both pickers are labelled "From", so they are told apart by id.
function picker(id: string) {
  return screen.getByLabelText("From", { selector: `#${id}` });
}

async function pickDate(id: string, iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  await userEvent.click(picker(id));
  await userEvent.selectOptions(screen.getByRole("combobox", { name: /year/i }), String(year));
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: /month/i }),
    String(month - 1),
  );
  const monthName = new Date(year, month - 1).toLocaleString("en", { month: "long" });
  const suffix = ORDINAL[ordinalRules.select(day)];
  await userEvent.click(
    screen.getByRole("button", { name: new RegExp(`${monthName} ${day}${suffix}, ${year}`) }),
  );
}

async function submitPrice(from: string, amount: string, currency = "JPY") {
  await pickDate("price-from", from);
  await userEvent.type(screen.getByLabelText(`Price (${currency})`), amount);
  await userEvent.click(screen.getByRole("button", { name: "Set price" }));
}

describe("SkuDetail", () => {
  beforeEach(() => {
    // Only Date is faked so promises and user-event timers keep running.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-20T12:00:00Z"));
  });

  test("defaults both dates to today", async () => {
    serveApi();
    renderDetail();
    await screen.findByText("￥1,480");

    expect(picker("price-from")).toHaveTextContent("Sep 20, 2026");
    expect(picker("discontinue-on")).toHaveTextContent("Sep 20, 2026");
  });

  test("shows the price history and events in the UI language", async () => {
    serveApi();
    renderDetail();

    const history = section("Price history");
    expect(await history.findByText("￥1,480")).toBeInTheDocument();
    expect(history.getByText(/8,90/)).toBeInTheDocument();
    expect(history.getAllByText("Oct 1, 2026 → now")).toHaveLength(2);
    expect(history.getAllByText("Apr 1, 2025 → Oct 1, 2026")).toHaveLength(1);

    const events = section("Events");
    expect(events.getByText("Launched at ￥1,480")).toBeInTheDocument();
    expect(events.getByText("New price ￥1,680")).toBeInTheDocument();
  });

  test("describes a discontinue event without a market", async () => {
    serveApi();
    renderDetail({ code: "MB-1000-D" });

    const item = (await screen.findByText("No longer sold")).closest("li") as HTMLElement;
    expect(within(item).getByText("Discontinued")).toBeInTheDocument();
    expect(within(item).queryByText("JP")).not.toBeInTheDocument();
  });

  test("falls back to the stored text when an event's price is missing", async () => {
    const fetch = serveApi();
    const real = fetch.getMockImplementation();
    fetch.mockImplementation((input, init) =>
      String(input).endsWith("/prices")
        ? Promise.resolve(Response.json([]))
        : (real as typeof globalThis.fetch)(input, init),
    );
    renderDetail();

    expect(await screen.findByText("Launched at 1480")).toBeInTheDocument();
  });

  test("uses the selected market's currency when a price's market is unknown", async () => {
    serveApi();
    renderDetail({ markets: [] });

    expect(await screen.findAllByText("￥890")).not.toHaveLength(0);
  });

  test("sets a new price and refreshes", async () => {
    serveApi();
    const { onChanged } = renderDetail();
    await screen.findByText("￥1,480");

    await submitPrice("2027-01-01", "1780");

    expect(await screen.findByRole("status")).toHaveTextContent("New Japan price from Jan 1, 2027");
    expect(await screen.findByText("New price ￥1,780")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledOnce();
  });

  test("accepts only digits and groups them with commas", async () => {
    serveApi();
    renderDetail();
    await screen.findByText("￥1,480");
    const amount = screen.getByLabelText("Price (JPY)");

    await userEvent.type(amount, "1a2.3-4567");

    expect(amount).toHaveValue("1,234,567");
  });

  test("keeps the caret in place when editing inside a grouped amount", async () => {
    serveApi();
    renderDetail();
    await screen.findByText("￥1,480");
    const amount = screen.getByLabelText("Price (JPY)") as HTMLInputElement;
    await userEvent.type(amount, "12345");

    await userEvent.type(amount, "9", { initialSelectionStart: 1, initialSelectionEnd: 1 });

    expect(amount).toHaveValue("192,345");
    expect(amount.selectionStart).toBe(2);
  });

  test("rejects an amount the market's currency cannot hold", async () => {
    const fetch = serveApi();
    const { onChanged } = renderDetail({ market: ES });
    await screen.findByText("￥1,480");
    const calls = fetch.mock.calls.length;

    await submitPrice("2027-01-01", "17.", "EUR");

    expect(screen.getByRole("status")).toHaveTextContent("Enter a price in EUR");
    expect(fetch.mock.calls.length).toBe(calls);
    expect(onChanged).not.toHaveBeenCalled();
  });

  test("shows the API's error when the price conflicts", async () => {
    serveApi();
    const { onChanged } = renderDetail();
    await screen.findByText("￥1,480");

    await submitPrice("2026-10-01", "1700");

    expect(await screen.findByRole("status")).toHaveTextContent(/already/i);
    expect(onChanged).not.toHaveBeenCalled();
  });

  test("discontinues the SKU", async () => {
    serveApi();
    const { onChanged } = renderDetail();
    await screen.findByText("￥1,480");

    await pickDate("discontinue-on", "2027-03-01");
    await userEvent.click(screen.getByRole("button", { name: "Discontinue" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Discontinued from Mar 1, 2027");
    expect(await screen.findByText("No longer sold")).toBeInTheDocument();
    expect(onChanged).toHaveBeenCalledOnce();
  });

  test("shows an error when the SKU cannot be loaded", async () => {
    serveApi();
    renderDetail({ code: "NOPE" });

    expect(await screen.findByRole("status")).toHaveTextContent(/NOPE/);
  });

  test("closes", async () => {
    serveApi();
    const { onClose } = renderDetail();

    await userEvent.click(screen.getByRole("button", { name: "Close details" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
