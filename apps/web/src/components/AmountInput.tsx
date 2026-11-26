import { type ChangeEvent, type ComponentProps, useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatAmountInput } from "@/lib/money";

type Props = Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "type"> & {
  minorUnit: number;
};

const countSignificant = (text: string) => text.replace(/[^\d.]/g, "").length;

// Finds the caret position in `formatted` that sits after the same number of digits
// as the caret had in the raw text, so inserted commas don't push it around.
function caretAfter(formatted: string, significantBefore: number): number {
  if (significantBefore === 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted.charAt(i))) seen++;
    if (seen === significantBefore) return i + 1;
  }
  return formatted.length;
}

export function AmountInput({ minorUnit, ...props }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (caret.current === null || ref.current !== document.activeElement) return;
    ref.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const formatted = formatAmountInput(raw, minorUnit);
    const before = raw.slice(0, event.target.selectionStart ?? raw.length);
    caret.current = caretAfter(formatted, countSignificant(formatAmountInput(before, minorUnit)));
    setValue(formatted);
  }

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode={minorUnit === 0 ? "numeric" : "decimal"}
      autoComplete="off"
      value={value}
      onChange={onChange}
    />
  );
}
