import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import i18n from "@/i18n";
import { DatePicker } from "./DatePicker.tsx";

describe("DatePicker", () => {
  test("shows a dash when the value is not a date", () => {
    render(<DatePicker value="" onChange={() => {}} />);

    expect(screen.getByRole("button")).toHaveTextContent("—");
  });

  test("picks a day as an ISO date and closes", async () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-11-26" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button", { name: /Next Month/i }));
    await userEvent.click(screen.getByRole("button", { name: /December 3rd, 2026/ }));

    expect(onChange).toHaveBeenCalledWith("2026-12-03");
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
  });

  test("navigates months and years with the caption selects", async () => {
    render(<DatePicker value="2026-11-26" onChange={() => {}} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("combobox", { name: /year/i }));
    await userEvent.click(await screen.findByRole("option", { name: "2028" }));
    await userEvent.click(screen.getByRole("combobox", { name: /month/i }));
    await userEvent.click(await screen.findByRole("option", { name: "Mar" }));

    expect(screen.getByRole("grid")).toHaveAccessibleName("March 2028");
  });

  test("uses the calendar locale of the UI language", async () => {
    await i18n.changeLanguage("ja");
    render(<DatePicker value="2026-11-26" onChange={() => {}} />);

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("grid")).toHaveAccessibleName("2026年11月");
  });

  test("falls back to the English calendar for a regional language tag", async () => {
    await i18n.changeLanguage("en-US");
    render(<DatePicker value="2026-11-26" onChange={() => {}} />);

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("grid")).toHaveAccessibleName("November 2026");
  });
});
