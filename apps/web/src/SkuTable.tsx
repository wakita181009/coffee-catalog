import type { ListedSku, Market, Roast } from "@coffee-catalog/api/catalog";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const SKELETON_ROWS = 6;

function SkuTableHeader() {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="pl-4">{t("table.sku")}</TableHead>
        <TableHead>{t("table.roast")}</TableHead>
        <TableHead>{t("table.origin")}</TableHead>
        <TableHead className="pr-4 text-right">{t("table.price")}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

// Mirrors SkuTable's row layout so the page doesn't shift when the data arrives.
export function SkuTableSkeleton() {
  const { t } = useTranslation();
  return (
    <Card className="py-0" aria-busy="true">
      <span className="sr-only" role="status">
        {t("table.loading")}
      </span>
      <Table aria-hidden="true">
        <SkuTableHeader />
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows never reorder.
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell className="pl-4">
                <div className="grid gap-1.5 py-0.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell className="pr-4">
                <Skeleton className="ml-auto h-4 w-14" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

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
        <SkuTableHeader />
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
