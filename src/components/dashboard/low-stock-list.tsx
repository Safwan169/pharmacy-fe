"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import type { LowStockItem } from "@/types";

/**
 * The restocking worklist.
 *
 * A shop that has just written down its opening stock can have five hundred
 * medicines below their reorder level, and printing all of them pushed the
 * rest of the dashboard off the bottom of the screen. The lowest few are the
 * ones worth acting on today; the rest are a button away.
 */
const PREVIEW = 10;

export function LowStockList({ items }: { items: LowStockItem[] }) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? items : items.slice(0, PREVIEW);
  const hidden = items.length - shown.length;

  return (
    <>
      <Table>
        <thead>
          <tr>
            <Th>{t("th.medicine")}</Th>
            <Th className="hidden md:table-cell">{t("th.madeBy")}</Th>
            <Th className="text-right">{t("th.left")}</Th>
            <Th className="text-right">{t("th.action")}</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((item) => (
            <tr key={item.variant_id} className="hover:bg-background/60">
              <Td>
                <p className="font-medium">
                  {item.brand_name}
                  {item.strength ? ` ${item.strength}` : ""}
                </p>
                <p className="text-xs text-muted">{item.dosage_form}</p>
              </Td>
              <Td className="hidden text-muted md:table-cell">{item.manufacturer}</Td>
              <Td className="text-right">
                {item.stock_quantity === 0 ? (
                  <Badge tone="danger">{t("stock.outOfStock")}</Badge>
                ) : (
                  <span className="font-medium tabular-nums text-warning">
                    {item.stock_quantity} {item.base_unit} {t("stock.left")}
                  </span>
                )}
              </Td>
              <Td className="text-right">
                <Link
                  href={`/catalogue/${item.variant_id}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {t("dashboard.addStock")}
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      {items.length > PREVIEW && (
        <div className="border-t border-border p-3 text-center">
          <button
            type="button"
            onClick={() => setShowAll((on) => !on)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-primary transition-colors hover:bg-background"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                {t("dashboard.showFewerLow")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                {t("dashboard.showAllLow", { count: hidden })}
              </>
            )}
          </button>
        </div>
      )}
    </>
  );
}
