import type { CatalogEvent, Market, Price } from "@coffee-catalog/api/catalog";
import { XIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { client, unwrap } from "./api.ts";
import { formatDate, marketName } from "./format.ts";
import { formatMoney, parseMoney } from "./money.ts";

type Props = {
  code: string;
  markets: Market[];
  market: Market;
  onChanged: () => void;
  onClose: () => void;
};

const EVENT_VARIANT = {
  launch: "default",
  price_change: "secondary",
  discontinue: "destructive",
} as const satisfies Record<CatalogEvent["kind"], string>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SkuDetail({ code, markets, market, onChanged, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const marketLabel = marketName(market.code, lang, market.name);
  const [prices, setPrices] = useState<Price[]>([]);
  const [events, setEvents] = useState<CatalogEvent[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    const param = { code };
    Promise.all([
      unwrap(client.api.skus[":code"].prices.$get({ param })),
      unwrap(client.api.skus[":code"].events.$get({ param })),
    ])
      .then(([p, e]) => {
        setPrices(p);
        setEvents(e);
      })
      .catch((e: Error) => setMessage({ kind: "error", text: e.message }));
  }, [code]);

  useEffect(load, [load]);

  async function run(action: () => Promise<unknown>, done: string) {
    try {
      await action();
      setMessage({ kind: "ok", text: done });
      load();
      onChanged();
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    }
  }

  function onPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const from = String(form.get("from"));
    const amountMinor = parseMoney(String(form.get("amount")), market.minorUnit);
    if (amountMinor === null) {
      setMessage({ kind: "error", text: t("message.enterPrice", { currency: market.currency }) });
      return;
    }
    run(
      () =>
        unwrap(
          client.api.skus[":code"].prices.$post({
            param: { code },
            json: { market: market.code, from, amountMinor },
          }),
        ),
      t("message.priceSet", { market: marketLabel, date: formatDate(from, lang) }),
    );
  }

  function onDiscontinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const on = String(new FormData(event.currentTarget).get("on"));
    run(
      () => unwrap(client.api.skus[":code"].discontinue.$post({ param: { code }, json: { on } })),
      t("message.discontinuedFrom", { date: formatDate(on, lang) }),
    );
  }

  const currencyOf = (marketCode: string) => markets.find((m) => m.code === marketCode) ?? market;

  // Events store English text; rebuild it from the price that the event created instead.
  function describe(e: CatalogEvent): string {
    if (e.kind === "discontinue") return t("event.discontinued");
    const price = prices.find((p) => p.market === e.market && p.validFrom === e.occurredOn);
    if (!price) return e.detail;
    const amount = formatMoney(price.amountMinor, currencyOf(price.market));
    return e.kind === "launch"
      ? t("event.launchedAt", { amount })
      : t("event.newPrice", { amount });
  }

  return (
    <aside aria-label={t("detail.label", { code })} className="lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <code className="font-mono text-base">{code}</code>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("detail.close")}>
              <XIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-6">
          {message && (
            <Alert variant={message.kind === "error" ? "destructive" : "default"} role="status">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Section title={t("detail.priceHistory")}>
            <ol className="grid gap-2">
              {prices.map((p) => (
                <li key={`${p.market}-${p.validFrom}`} className="flex items-center gap-3 text-sm">
                  <Badge variant="outline">{p.market}</Badge>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDate(p.validFrom, lang)} →{" "}
                    {p.validTo ? formatDate(p.validTo, lang) : t("detail.now")}
                  </span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatMoney(p.amountMinor, currencyOf(p.market))}
                  </span>
                </li>
              ))}
            </ol>
          </Section>

          <Separator />

          <Section title={t("detail.newPrice", { market: marketLabel })}>
            <form className="flex flex-wrap items-end gap-3" onSubmit={onPrice}>
              <div className="grid gap-1.5">
                <Label htmlFor="price-from">{t("detail.from")}</Label>
                <Input id="price-from" type="date" name="from" required />
              </div>
              <div className="grid w-28 gap-1.5">
                <Label htmlFor="price-amount">
                  {t("detail.price", { currency: market.currency })}
                </Label>
                <Input id="price-amount" name="amount" inputMode="decimal" required />
              </div>
              <Button type="submit">{t("detail.setPrice")}</Button>
            </form>
          </Section>

          <Section title={t("detail.discontinue")}>
            <form className="flex flex-wrap items-end gap-3" onSubmit={onDiscontinue}>
              <div className="grid gap-1.5">
                <Label htmlFor="discontinue-on">{t("detail.discontinueOn")}</Label>
                <Input id="discontinue-on" type="date" name="on" required />
              </div>
              <Button type="submit" variant="destructive">
                {t("detail.discontinueAction")}
              </Button>
            </form>
          </Section>

          <Separator />

          <Section title={t("detail.events")}>
            <ol className="grid gap-2">
              {events.map((e) => (
                <li
                  key={`${e.occurredOn}-${e.kind}-${e.market ?? ""}-${e.detail}`}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <time dateTime={e.occurredOn} className="text-muted-foreground tabular-nums">
                    {formatDate(e.occurredOn, lang)}
                  </time>
                  <Badge variant={EVENT_VARIANT[e.kind]}>{t(`event.${e.kind}`)}</Badge>
                  {e.market && <Badge variant="outline">{e.market}</Badge>}
                  <span>{describe(e)}</span>
                </li>
              ))}
            </ol>
          </Section>
        </CardContent>
      </Card>
    </aside>
  );
}
