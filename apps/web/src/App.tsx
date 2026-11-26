import type { ListedSku, Market } from "@coffee-catalog/api/catalog";
import { PlusIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/DatePicker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { marketName } from "@/lib/format";
import { client, unwrap } from "./api.ts";
import { NewSkuForm } from "./NewSkuForm.tsx";
import { SkuDetail } from "./SkuDetail.tsx";
import { SkuTable, SkuTableSkeleton } from "./SkuTable.tsx";

type SkuList = { market: string; on: string; rows: ListedSku[] };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function App() {
  const { t, i18n } = useTranslation();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketCode, setMarketCode] = useState("JP");
  const [on, setOn] = useState(today);
  const [list, setList] = useState<SkuList | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestQuery = useRef("");

  const market = markets.find((m) => m.code === marketCode);
  // Rows fetched for another market/date are stale: show the skeleton until the new ones land,
  // but keep current rows visible while they are refreshed after an edit.
  const skus = list?.market === marketCode && list.on === on ? list.rows : null;

  useEffect(() => {
    unwrap(client.api.markets.$get())
      .then(setMarkets)
      .catch((e: Error) => setError(e.message));
  }, []);

  const loadSkus = useCallback(() => {
    if (!on) return;
    const query = `${marketCode}|${on}`;
    latestQuery.current = query;
    unwrap(client.api.skus.$get({ query: { market: marketCode, on } }))
      .then((rows) => {
        // Switching market/date quickly can resolve requests out of order.
        if (latestQuery.current !== query) return;
        setList({ market: marketCode, on, rows });
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [marketCode, on]);

  useEffect(loadSkus, [loadSkus]);

  function select(code: string | null) {
    setCreating(false);
    setSelected(code);
  }

  function startCreating() {
    setSelected(null);
    setCreating(true);
  }

  function onCreated(code: string) {
    select(code);
    loadSkus();
  }

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
            variant="outline"
            value={[marketCode]}
            // Base UI emits [] when the active item is clicked again; keep a market selected.
            onValueChange={([value]) => value && setMarketCode(value)}
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
            <DatePicker id="prices-on" value={on} onChange={setOn} className="w-44" />
          </div>
          <LanguageSwitcher />
          <Button onClick={startCreating} disabled={!market}>
            <PlusIcon data-icon="inline-start" />
            {t("newSku.open")}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <main className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {market && skus ? (
          <SkuTable skus={skus} market={market} selected={selected} onSelect={select} />
        ) : (
          !error && <SkuTableSkeleton />
        )}
        {selected && market && (
          <SkuDetail
            key={selected}
            code={selected}
            markets={markets}
            market={market}
            onChanged={loadSkus}
            onClose={() => select(null)}
          />
        )}
        {creating && market && (
          <NewSkuForm
            markets={markets}
            market={market}
            on={on}
            onCreated={onCreated}
            onClose={() => setCreating(false)}
          />
        )}
      </main>
    </div>
  );
}
