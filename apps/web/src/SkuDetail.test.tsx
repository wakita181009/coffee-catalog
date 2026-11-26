import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
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

async function submitPrice(from: string, amount: string) {
  fireEvent.change(screen.getByLabelText("From", { selector: "#price-from" }), {
    target: { value: from },
  });
  await userEvent.type(screen.getByLabelText("Price (JPY)"), amount);
  await userEvent.click(screen.getByRole("button", { name: "Set price" }));
}

describe("SkuDetail", () => {
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

  test("rejects an amount the market's currency cannot hold", async () => {
    const fetch = serveApi();
    const { onChanged } = renderDetail();
    await screen.findByText("￥1,480");
    const calls = fetch.mock.calls.length;

    await submitPrice("2027-01-01", "17.80");

    expect(screen.getByRole("status")).toHaveTextContent("Enter a price in JPY");
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

    fireEvent.change(screen.getByLabelText("From", { selector: "#discontinue-on" }), {
      target: { value: "2027-03-01" },
    });
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
