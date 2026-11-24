import type { ListedSku, Market } from "@coffee-catalog/api/catalog";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { client, unwrap } from "./api.ts";
import { marketName } from "./format.ts";
import { LanguageSwitcher } from "./LanguageSwitcher.tsx";
import { SkuDetail } from "./SkuDetail.tsx";
import { SkuTable } from "./SkuTable.tsx";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function App() {
  const { t, i18n } = useTranslation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketCode, setMarketCode] = useState("JP");
  const [on, setOn] = useState(today);
  const [skus, setSkus] = useState<ListedSku[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const market = markets.find((m) => m.code === marketCode);

  useEffect(() => {
    unwrap(client.api.markets.$get())
      .then(setMarkets)
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadSkus = useCallback(() => {
    if (!on) return;
    unwrap(client.api.skus.$get({ query: { market: marketCode, on } }))
      .then((rows) => {
        setSkus(rows);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [marketCode, on]);

  useEffect(loadSkus, [loadSkus]);

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b pb-6">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
            {t("app.eyebrow")}
          </p>
          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">
            {t("app.title")}
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <ToggleGroup
            type="single"
            variant="outline"
            value={marketCode}
            // Radix emits "" when the active item is clicked again; keep a market selected.
            onValueChange={(value) => value && setMarketCode(value)}
            aria-label={t("app.market")}
          >
            {markets.map((m) => (
              <ToggleGroupItem key={m.code} value={m.code} className="px-4">
                {marketName(m.code, i18n.language, m.name)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="grid gap-1.5">
            <Label htmlFor="prices-on">{t("app.pricesOn")}</Label>
            <Input
              id="prices-on"
              type="date"
              value={on}
              onChange={(e) => setOn(e.target.value)}
              className="w-40"
            />
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <main className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {market && (
          <SkuTable skus={skus} market={market} selected={selected} onSelect={setSelected} />
        )}
        {selected && market && (
          <SkuDetail
            key={selected}
            code={selected}
            markets={markets}
            market={market}
            onChanged={loadSkus}
            onClose={() => setSelected(null)}
          />
        )}
      </main>
    </div>
  );
}
