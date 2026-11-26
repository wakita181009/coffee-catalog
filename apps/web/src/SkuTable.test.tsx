import type { ListedSku } from "@coffee-catalog/api/catalog";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SkuTable } from "./SkuTable.tsx";

const JP = { code: "JP", name: "Japan", currency: "JPY", minorUnit: 0 };

const sku = (overrides: Partial<ListedSku>): ListedSku => ({
  code: "MB-250-M",
  family: "Morning Blend",
  name: "Morning Blend 250 g, medium roast",
  roast: "medium",
  weightG: 250,
  origin: "Brazil, Colombia",
  discontinuedOn: null,
  market: "JP",
  launchedOn: "2025-04-01",
  amountMinor: 1680,
  ...overrides,
});

describe("SkuTable", () => {
  test("says nothing is on sale when the list is empty", () => {
    render(<SkuTable skus={[]} market={JP} selected={null} onSelect={() => {}} />);

    expect(screen.getByText("Nothing on sale in Japan on this date.")).toBeInTheDocument();
  });

  test("shows prices, a dash for unpriced SKUs, and marks the selected row", async () => {
    const onSelect = vi.fn();
    render(
      <SkuTable
        skus={[sku({}), sku({ code: "SO-1", name: "Single", roast: "light", amountMinor: null })]}
        market={JP}
        selected="SO-1"
        onSelect={onSelect}
      />,
    );

    const [, first, second] = screen.getAllByRole("row");
    expect(first).toHaveTextContent("￥1,680");
    expect(first).not.toHaveAttribute("data-state");
    expect(second).toHaveTextContent("—");
    expect(second).toHaveAttribute("data-state", "selected");
    expect(second).toHaveTextContent("Light");

    await userEvent.click(screen.getByRole("button", { name: /Morning Blend 250 g/ }));
    expect(onSelect).toHaveBeenCalledWith("MB-250-M");
  });
});
