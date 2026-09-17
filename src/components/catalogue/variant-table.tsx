import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Table, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceCell, StockCell, SellableBadge } from "./status-badges";
import { VariantRow } from "./variant-row";
import type { ProductVariant } from "@/types";

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
          <Th>Medicine</Th>
          <Th className="hidden 2xl:table-cell">Ingredient</Th>
          <Th className="hidden md:table-cell">Company</Th>
          <Th className="text-right">Price</Th>
          <Th className="text-right">In stock</Th>
          <Th>Status</Th>
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
            </Td>
            <Td className="hidden max-w-[16rem] truncate text-muted 2xl:table-cell">
              {variant.generic?.name ?? "Not recorded"}
            </Td>
            <Td className="hidden max-w-[14rem] truncate text-muted md:table-cell">
              {variant.product.manufacturer?.name ?? "—"}
            </Td>
            <Td className="text-right">
              <PriceCell
                price={variant.price}
                unit={variant.units?.find((u) => u.isDefault)?.name}
              />
            </Td>
            <Td className="text-right">
              <StockCell stock={variant.stockQuantity} unit={variant.baseUnit} />
            </Td>
            <Td>
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
