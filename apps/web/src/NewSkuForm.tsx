import type { Market, Roast } from "@coffee-catalog/api/catalog";
import { XIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatePicker } from "@/components/DatePicker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { marketName } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { client, unwrap } from "./api.ts";

type Props = {
  markets: Market[];
  market: Market;
  on: string;
  onCreated: (code: string) => void;
  onClose: () => void;
};

const ROASTS: Roast[] = ["light", "medium", "dark"];

// Family names are free text, so the "new family" choice needs a value no name can take.
const NEW_FAMILY = "\u0000new-family";

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function NewSkuForm({ markets, market, on, onCreated, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [families, setFamilies] = useState<string[]>([]);
  const [family, setFamily] = useState(NEW_FAMILY);
  const [roast, setRoast] = useState<Roast>("medium");
  const [marketCode, setMarketCode] = useState(market.code);
  const [launchOn, setLaunchOn] = useState(on);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const launchMarket = markets.find((m) => m.code === marketCode) ?? market;
  const familyItems = [
    ...families.map((name) => ({ value: name, label: name })),
    { value: NEW_FAMILY, label: t("newSku.newFamily") },
  ];
  const marketItems = markets.map((m) => ({
    value: m.code,
    label: marketName(m.code, i18n.language, m.name),
  }));

  useEffect(() => {
    unwrap(client.api.families.$get())
      .then((names) => {
        setFamilies(names);
        setFamily(names[0] ?? NEW_FAMILY);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function create(input: {
    code: string;
    family: string;
    isNewFamily: boolean;
    sku: { name: string; roast: Roast; weightG: number; origin: string };
    amountMinor: number;
  }) {
    if (input.isNewFamily) {
      await unwrap(client.api.families.$post({ json: { name: input.family } }));
      // Select it, so a retry after a later step fails does not try to create it again.
      setFamilies((names) => [...names, input.family].sort());
      setFamily(input.family);
    }
    await unwrap(
      client.api.skus.$post({ json: { code: input.code, family: input.family, ...input.sku } }),
    );
    await unwrap(
      client.api.skus[":code"].launches.$post({
        param: { code: input.code },
        json: { market: launchMarket.code, on: launchOn, amountMinor: input.amountMinor },
      }),
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    const weightG = Number(text("weight"));
    if (!Number.isInteger(weightG) || weightG <= 0) {
      setError(t("newSku.enterWeight"));
      return;
    }
    const amountMinor = parseMoney(text("amount"), launchMarket.minorUnit);
    if (amountMinor === null) {
      setError(t("message.enterPrice", { currency: launchMarket.currency }));
      return;
    }

    const isNewFamily = family === NEW_FAMILY;
    const code = text("code");
    setBusy(true);
    try {
      await create({
        code,
        family: isNewFamily ? text("newFamily") : family,
        isNewFamily,
        sku: { name: text("name"), roast, weightG, origin: text("origin") },
        amountMinor,
      });
      onCreated(code);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <aside aria-label={t("newSku.title")} className="lg:sticky lg:top-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("newSku.title")}</CardTitle>
          <CardAction>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("newSku.close")}>
              <XIcon />
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent>
          <form className="grid grid-cols-2 gap-4" onSubmit={onSubmit}>
            {error && (
              <Alert variant="destructive" role="status" className="col-span-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field id="sku-code" label={t("newSku.code")}>
              <Input id="sku-code" name="code" className="font-mono" required />
            </Field>
            <Field id="sku-weight" label={t("newSku.weight")}>
              <Input id="sku-weight" name="weight" inputMode="numeric" required />
            </Field>
            <Field id="sku-name" label={t("newSku.name")} className="col-span-2">
              <Input id="sku-name" name="name" required />
            </Field>
            <Field id="sku-family" label={t("newSku.family")} className="col-span-2">
              <Select
                items={familyItems}
                value={family}
                onValueChange={(value) => value && setFamily(value)}
              >
                <SelectTrigger id="sku-family" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {familyItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {family === NEW_FAMILY && (
              <Field id="sku-new-family" label={t("newSku.familyName")} className="col-span-2">
                <Input id="sku-new-family" name="newFamily" required />
              </Field>
            )}
            <Field id="sku-origin" label={t("newSku.origin")} className="col-span-2">
              <Input id="sku-origin" name="origin" required />
            </Field>
            <div className="col-span-2 grid gap-1.5">
              <span className="text-sm font-medium" id="sku-roast">
                {t("newSku.roast")}
              </span>
              <ToggleGroup
                variant="outline"
                value={[roast]}
                onValueChange={([value]) => value && setRoast(value as Roast)}
                aria-labelledby="sku-roast"
              >
                {ROASTS.map((r) => (
                  <ToggleGroupItem key={r} value={r} className="flex-1">
                    {t(`roast.${r}`)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Separator className="col-span-2" />
            <h3 className="col-span-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
              {t("newSku.launch")}
            </h3>

            <Field id="sku-market" label={t("newSku.market")}>
              <Select
                items={marketItems}
                value={marketCode}
                onValueChange={(value) => value && setMarketCode(value)}
              >
                <SelectTrigger id="sku-market" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {marketItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="sku-launch-on" label={t("newSku.launchOn")}>
              <DatePicker
                id="sku-launch-on"
                value={launchOn}
                onChange={setLaunchOn}
                className="w-full"
              />
            </Field>
            <Field
              id="sku-amount"
              label={t("detail.price", { currency: launchMarket.currency })}
              className="col-span-2"
            >
              <Input id="sku-amount" name="amount" inputMode="decimal" required />
            </Field>

            <Button type="submit" className="col-span-2" disabled={busy}>
              {t("newSku.create")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </aside>
  );
}
