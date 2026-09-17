"use client";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, pluralise } from "@/lib/utils";
import { useT } from "@/i18n/client";

/**
 * The catalogue's two nullable numbers, shown so their meaning can't be
 * misread.
 *
 * `null` and `0` are different facts and the UI never blurs them:
 *   price  null → nobody has priced it yet, so it cannot be sold
 *   stock  null → nobody has counted it yet
 *   stock  0    → counted, and confirmed to have run out
 */

const LOW_STOCK_THRESHOLD = 5;

export function PriceCell({
  price,
  unit,
}: {
  price: number | null;
  /** The unit that price is for — "strip". Shown small next to the amount. */
  unit?: string;
}) {
  const t = useT();
  if (price === null) {
    return (
      <Badge tone="warning" className="font-normal">
        {t("badge.notPriced")}
      </Badge>
    );
  }
  return (
    <span className="font-medium tabular-nums">
      {formatCurrency(price)}
      {unit && <span className="ml-1 text-xs font-normal text-muted">/ {unit}</span>}
    </span>
  );
}

export function StockCell({
  stock,
  unit,
}: {
  stock: number | null;
  /** The base unit the count is in — "tablet". */
  unit?: string;
}) {
  const t = useT();
  if (stock === null) {
    return (
      <Badge tone="neutral" className="font-normal">
        {t("badge.notCounted")}
      </Badge>
    );
  }
  if (stock === 0) {
    return <Badge tone="danger">{t("stock.outOfStock")}</Badge>;
  }
  const label = unit ? ` ${pluralise(unit, stock)}` : "";
  if (stock < LOW_STOCK_THRESHOLD) {
    return (
      <Badge tone="warning">
        {stock}{label} {t("badge.runningLow")}
      </Badge>
    );
  }
  return (
    <span className="tabular-nums">
      {stock.toLocaleString()}
      {label && <span className="ml-1 text-xs text-muted">{label}</span>}
    </span>
  );
}

/** Whether the SKU is sellable at the counter, and why not when it isn't. */
export function SellableBadge({
  isActive,
  price,
  stock,
}: {
  isActive: boolean;
  price: number | null;
  stock: number | null;
}) {
  const t = useT();
  if (!isActive) return <Badge tone="neutral">{t("badge.withdrawn")}</Badge>;
  if (price === null) return <Badge tone="warning">{t("badge.needsPrice")}</Badge>;
  if (stock === null || stock === 0) return <Badge tone="danger">{t("badge.noStock")}</Badge>;
  return <Badge tone="success">{t("badge.onSale")}</Badge>;
}
