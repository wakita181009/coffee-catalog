import type { ListedSku, Market, Roast } from "@coffee-catalog/api/catalog";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketName } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const ROAST_CLASS: Record<Roast, string> = {
  light: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  medium: "bg-orange-200 text-orange-950 dark:bg-orange-950 dark:text-orange-200",
  dark: "bg-stone-800 text-stone-50 dark:bg-stone-200 dark:text-stone-900",
};

type Props = {
  skus: ListedSku[];
  market: Market;
  selected: string | null;
  onSelect: (code: string) => void;
};

export function SkuTable({ skus, market, selected, onSelect }: Props) {
  const { t, i18n } = useTranslation();

  if (skus.length === 0) {
    return (
      <Card className="items-center py-16 text-muted-foreground">
        {t("table.empty", { market: marketName(market.code, i18n.language, market.name) })}
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">{t("table.sku")}</TableHead>
            <TableHead>{t("table.roast")}</TableHead>
            <TableHead>{t("table.origin")}</TableHead>
            <TableHead className="pr-4 text-right">{t("table.price")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skus.map((sku) => (
            <TableRow key={sku.code} data-state={sku.code === selected ? "selected" : undefined}>
              <TableCell className="pl-4">
                <button
                  type="button"
                  className="group grid text-left outline-none"
                  onClick={() => onSelect(sku.code)}
                >
                  <span className="text-xs text-muted-foreground">{sku.family}</span>
                  <span className="font-medium underline-offset-4 group-hover:underline group-focus-visible:underline">
                    {sku.name}
                  </span>
                  <code className="font-mono text-xs text-muted-foreground">{sku.code}</code>
                </button>
              </TableCell>
              <TableCell>
                <Badge className={cn(ROAST_CLASS[sku.roast])}>{t(`roast.${sku.roast}`)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{sku.origin}</TableCell>
              <TableCell className="pr-4 text-right font-medium tabular-nums">
                {sku.amountMinor === null ? "—" : formatMoney(sku.amountMinor, market)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
