import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { en, type Messages } from "./locales/en.ts";
import { ja } from "./locales/ja.ts";
import { pl } from "./locales/pl.ts";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "pl", label: "Polski" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export const resources = {
  en: { translation: en },
  ja: { translation: ja },
  pl: { translation: pl },
} satisfies Record<Language, { translation: Messages }>;

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: Messages };
  }
}

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  document.title = i18n.t("app.title");
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: LANGUAGES.map((l) => l.code),
    fallbackLng: "en",
    // "pl-PL" from the browser should resolve to "pl", not fall back to English.
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
    // React already escapes rendered strings.
    interpolation: { escapeValue: false },
  });

export default i18n;
