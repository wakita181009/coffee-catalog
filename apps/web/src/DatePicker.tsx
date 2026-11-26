import { CalendarIcon } from "lucide-react";
import { useId, useState } from "react";
import type { Locale } from "react-day-picker";
import { enUS } from "react-day-picker/locale/en-US";
import { es } from "react-day-picker/locale/es";
import { ja } from "react-day-picker/locale/ja";
import { pl } from "react-day-picker/locale/pl";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "./format.ts";
import type { Language } from "./i18n/index.ts";
import { isoToLocalDate, localDateToIso } from "./isoDate.ts";

const DAY_PICKER_LOCALES: Record<Language, Locale> = { en: enUS, es, ja, pl };

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  className?: string;
};

// The dropdown caption only offers years inside [startMonth, endMonth], and DayPicker
// defaults endMonth to the current year, which would hide scheduled future prices.
const YEAR_SPAN = 10;

export function DatePicker({ id, value, onChange, className }: DatePickerProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const valueId = useId();
  const selected = isoToLocalDate(value);
  const locale = DAY_PICKER_LOCALES[i18n.language as Language] ?? enUS;
  const thisYear = new Date().getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* A <label for> replaces the button's own text as its name, so the date is attached
            as a description to keep it announced. */}
        <Button id={id} variant="outline" className={className} aria-describedby={valueId}>
          <CalendarIcon data-icon="inline-start" />
          <span id={valueId} className="flex-1 text-left tabular-nums">
            {selected ? formatDate(value, i18n.language) : "—"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(localDateToIso(date));
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(thisYear - YEAR_SPAN, 0)}
          endMonth={new Date(thisYear + YEAR_SPAN, 11)}
          locale={locale}
        />
      </PopoverContent>
    </Popover>
  );
}
