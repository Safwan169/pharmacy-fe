"use server";

import { listVariants } from "@/lib/api/catalogue";
import type { ProductVariant } from "@/types";

export interface CounterUnit {
  id: number;
  name: string;
  qtyInBase: number;
  price: number;
  isDefault: boolean;
}

export interface CounterSearchResult {
  id: number;
  name: string;
  dosageForm: string;
  manufacturer: string;
  generic: string | null;
  /** Default-unit price, for the badge only. */
  price: number | null;
  /** In the base unit. */
  stock: number | null;
  baseUnit: string;
  /** Sellable, priced units only — what the counter can actually ring up. */
  units: CounterUnit[];
}

/**
 * Item lookup for the counter.
 *
 * A Server Action rather than a public route handler, so the browser still
 * never holds a token and the API's address stays server-side. Only active
 * SKUs are returned — a withdrawn one can't be sold, so offering it would just
 * lead to a rejected checkout.
 */
export async function searchForCounter(term: string): Promise<CounterSearchResult[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const result = await listVariants({
    search: query,
    status: "active",
    limit: 20,
  });

  return result.data.map(toResult);
}

function toResult(variant: ProductVariant): CounterSearchResult {
  return {
    id: variant.id,
    name: `${variant.product.brandName}${variant.strength ? ` ${variant.strength}` : ""}`,
    dosageForm: variant.dosageForm,
    manufacturer: variant.product.manufacturer?.name ?? "",
    generic: variant.generic?.name ?? null,
    price: variant.price,
    stock: variant.stockQuantity,
    baseUnit: variant.baseUnit,
    units: (variant.units ?? [])
      .filter((u) => u.isSellable && u.price !== null)
      .map((u) => ({
        id: u.id,
        name: u.name,
        qtyInBase: u.qtyInBase,
        price: u.price as number,
        isDefault: u.isDefault,
      })),
  };
}
