import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";

describe("LanguageSwitcher", () => {
  test("switches the UI language and updates the document", async () => {
    render(<LanguageSwitcher />);

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
    await userEvent.click(await screen.findByRole("option", { name: "Español" }));

    expect(await screen.findByRole("combobox", { name: "Idioma" })).toHaveTextContent("Español");
    expect(document.documentElement.lang).toBe("es");
    expect(document.title).toBe("Catálogo de café");
  });
});
