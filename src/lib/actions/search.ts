"use server";

import { getFavourites, listVariants } from "@/lib/api/catalogue";
import type { ProductVariant } from "@/types";

export interface CounterUnit {
  id: number;
  name: string;
  qtyInBase: number;
  price: number;
  isDefault: boolean;
  /** Set when a new price is waiting for the old stock to sell out. */
  nextPrice?: { price: number; oldStockLeft: number };
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
/** The counter's quick-pick tiles: what this shop sells most. */
export async function listFavourites(): Promise<CounterSearchResult[]> {
  const variants = await getFavourites({ limit: 18, days: 30 });
  return variants.map(toResult).filter((item) => item.units.length > 0 && (item.stock ?? 0) > 0);
}

export async function searchForCounter(
  term: string,
): Promise<CounterSearchResult[]> {
  const query = term.trim();
  if (query.length < 1) return [];

  const result = await listVariants({
    search: query,
    status: "active",
    limit: 20,
  });
  if (result.data.length > 0) return result.data.map(toResult);

  // Nothing matched: try again on a shorter stem, so a slip like "nappa" or a
  // half-remembered ending still reaches "Napa" instead of an empty list.
  const words = query.split(/\s+/);
  const stem = words[0].slice(0, Math.max(3, words[0].length - 2));
  if (stem.length < 3 || stem === query) return [];
  const retry = await listVariants({ search: stem, status: "active", limit: 20 });
  return retry.data.map(toResult);
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
      .map((u) => {
        const waiting = variant.pendingPrice?.unitPrices.find(
          (p) => p.unit_id === u.id,
        );
        return {
          id: u.id,
          name: u.name,
          qtyInBase: u.qtyInBase,
          price: u.price as number,
          isDefault: u.isDefault,
          nextPrice:
            waiting && waiting.price !== u.price
              ? {
                  price: waiting.price,
                  oldStockLeft: variant.pendingPrice?.oldStockLeft ?? 0,
                }
              : undefined,
        };
      }),
  };
}
