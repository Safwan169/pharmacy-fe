"use client";

import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceCell, StockCell, SellableBadge } from "./status-badges";
import { VariantRow } from "./variant-row";
import type { ProductVariant } from "@/types";
import { useT } from "@/i18n/client";

/**
 * The catalogue's main listing. Shared by the browse screen and the pricing
 * worklist so a SKU reads identically wherever it appears. Clicking anywhere
 * on a row opens that medicine.
 */
export function VariantTable({
  variants,
  emptyTitle,
  emptyDescription,
}: {
  variants: ProductVariant[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const t = useT();
  if (variants.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>{t("th.medicine")}</Th>
          <Th className="hidden 2xl:table-cell">{t("th.ingredient")}</Th>
          <Th className="hidden md:table-cell">{t("th.company")}</Th>
          {/* A phone is barely wider than one medicine's name, and splitting
              it into four columns left names like "3-C 100 mg/5 ml" stacked
              three words deep. Below sm the row is one column and these move
              underneath the name. */}
          <Th className="hidden text-right sm:table-cell">{t("th.price")}</Th>
          <Th className="hidden text-right sm:table-cell">{t("th.inStock")}</Th>
          <Th className="hidden sm:table-cell">{t("th.status")}</Th>
        </tr>
      </thead>
      <tbody>
        {variants.map((variant) => (
          <VariantRow key={variant.id} href={`/catalogue/${variant.id}`}>
            <Td>
              <Link
                href={`/catalogue/${variant.id}`}
                className="font-medium hover:underline focus-visible:underline focus-visible:outline-none"
              >
                {variant.product.brandName}
                {variant.strength ? ` ${variant.strength}` : ""}
              </Link>
              <p className="text-xs text-muted">{variant.dosageForm}</p>
              {/* What the hidden columns said. The status badge is left out:
                  it only restates the price and the count, which are here. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                <PriceCell
                  price={variant.price}
                  unit={variant.units?.find((u) => u.isDefault)?.name}
                />
                <StockCell stock={variant.stockQuantity} unit={variant.baseUnit} />
              </div>
            </Td>
            <Td className="hidden max-w-[16rem] truncate text-muted 2xl:table-cell">
              {variant.generic?.name ?? t("catalogue.notRecorded")}
            </Td>
            <Td className="hidden max-w-[14rem] truncate text-muted md:table-cell">
              {variant.product.manufacturer?.name ?? "—"}
            </Td>
            <Td className="hidden text-right sm:table-cell">
              <PriceCell
                price={variant.price}
                unit={variant.units?.find((u) => u.isDefault)?.name}
              />
            </Td>
            <Td className="hidden text-right sm:table-cell">
              <StockCell stock={variant.stockQuantity} unit={variant.baseUnit} />
            </Td>
            <Td className="hidden sm:table-cell">
              <SellableBadge
                isActive={variant.isActive}
                price={variant.price}
                stock={variant.stockQuantity}
              />
            </Td>
          </VariantRow>
        ))}
      </tbody>
    </Table>
  );
}
