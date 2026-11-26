import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/i18n";

// Base UI's SelectValue renders the raw value unless `items` maps it to a label.
const LANGUAGE_ITEMS = LANGUAGES.map((l) => ({ value: l.code, label: l.label }));

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor="language">{t("app.language")}</Label>
      <Select
        items={LANGUAGE_ITEMS}
        value={i18n.resolvedLanguage}
        onValueChange={(lng) => lng && i18n.changeLanguage(lng)}
      >
        <SelectTrigger id="language" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
