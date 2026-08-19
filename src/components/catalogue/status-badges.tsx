import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

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

export function PriceCell({ price }: { price: number | null }) {
  if (price === null) {
    return (
      <Badge tone="warning" className="font-normal">
        Not priced yet
      </Badge>
    );
  }
  return <span className="font-medium tabular-nums">{formatCurrency(price)}</span>;
}

export function StockCell({ stock }: { stock: number | null }) {
  if (stock === null) {
    return (
      <Badge tone="neutral" className="font-normal">
        Not counted yet
      </Badge>
    );
  }
  if (stock === 0) {
    return <Badge tone="danger">Out of stock</Badge>;
  }
  if (stock < LOW_STOCK_THRESHOLD) {
    return (
      <Badge tone="warning">
        {stock} left — running low
      </Badge>
    );
  }
  return <span className="tabular-nums">{stock.toLocaleString()}</span>;
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
  if (!isActive) return <Badge tone="neutral">Withdrawn from sale</Badge>;
  if (price === null) return <Badge tone="warning">Needs a price</Badge>;
  if (stock === null || stock === 0) return <Badge tone="danger">No stock to sell</Badge>;
  return <Badge tone="success">On sale</Badge>;
}
