"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  addVariantBarcode,
  getFavourites,
  getVariant,
  getVariantByBarcode,
  listVariants,
} from "@/lib/api/catalogue";
import { receiveStock } from "@/lib/actions/stock";
import type { ProductVariant } from "@/types";
import { getT } from "@/i18n/server";

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
/** Priced, on the shelf, ringable — the only thing a counter can offer. */
const isSellable = (item: CounterSearchResult) =>
  item.units.length > 0 && (item.stock ?? 0) > 0;

/** The counter's quick-pick tiles: what this shop sells most. */
export async function listFavourites(): Promise<CounterSearchResult[]> {
  const variants = await getFavourites({ limit: 18, days: 30 });
  return variants.map(toResult).filter(isSellable);
}

export type ScanResult =
  | { status: "found"; item: CounterSearchResult; unitId: number | null }
  | { status: "unknown"; code: string }
  | { status: "unsellable"; item: CounterSearchResult };

/**
 * What a scan means at the counter. An unpaired code is the ordinary first
 * answer for a pack the shop has never scanned, so it comes back as something
 * to act on rather than as a failure.
 */
export async function scanBarcode(code: string): Promise<ScanResult> {
  const clean = code.trim().toUpperCase();
  try {
    const scanned = await getVariantByBarcode(clean);
    const item = toResult(scanned.variant);
    return item.units.length > 0 && (item.stock ?? 0) > 0
      ? { status: "found", item, unitId: scanned.unit_id }
      : { status: "unsellable", item };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { status: "unknown", code: clean };
    }
    throw error;
  }
}

export type PairResult = { status: "paired" } | { status: "error"; message: string };

/** Remembers a code against a medicine, so the next scan just rings it up. */
export async function pairBarcode(
  variantId: number,
  code: string,
  unitId?: number,
): Promise<PairResult> {
  try {
    await addVariantBarcode(variantId, {
      code: code.trim().toUpperCase(),
      ...(unitId === undefined ? {} : { unit_id: unitId }),
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath(`/catalogue/${variantId}`);
  return { status: "paired" };
}

export interface TypedCodeState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** A pack's code is printed under its bars, and a shop without a working
 * scanner can only get it in by reading it off the box. Slower than scanning
 * and worth avoiding, but a shop whose scanner has died must not be left
 * unable to teach the system anything at all. */
export async function typeBarcode(
  _prev: TypedCodeState,
  formData: FormData,
): Promise<TypedCodeState> {
  const t = await getT();
  const variantId = Number(formData.get("variant_id"));
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: t("action.reload") };
  }
  if (!/^[0-9A-Z-]{4,32}$/.test(code)) {
    return { status: "error", message: t("scan.codeInvalid") };
  }
  const result = await pairBarcode(variantId, code);
  return result.status === "error"
    ? { status: "error", message: result.message }
    : { status: "success", message: t("scan.added") };
}

export async function searchForCounter(
  term: string,
): Promise<CounterSearchResult[]> {
  const query = term.trim();
  if (query.length < 1) return [];

  const found = await sellableMatches(query);
  if (found.length > 0) return found;

  // Nothing matched: try again on a shorter stem, so a slip like "nappa" or a
  // half-remembered ending still reaches "Napa" instead of an empty list.
  const words = query.split(/\s+/);
  const stem = words[0].slice(0, Math.max(3, words[0].length - 2));
  if (stem.length < 3 || stem === query) return [];
  return sellableMatches(stem);
}

/**
 * The counter offers only what it can actually ring up.
 *
 * One brand is a dozen catalogue rows — every strength, every form the
 * manufacturer makes — and typing "napa" used to answer with eight of them
 * marked "no price set" before the two boxes on the shelf. The catalogue is
 * where those are looked up; this is where medicine is sold.
 */
async function sellableMatches(search: string): Promise<CounterSearchResult[]> {
  const result = await listVariants({
    search,
    status: "active",
    pricing_status: "set",
    limit: 20,
  });
  return result.data.map(toResult).filter(isSellable);
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

/**
 * What the counter found but cannot sell: no price on it, or none left on the
 * shelf. Offered only so a medicine fetched from the shop next door can be
 * rung up without leaving the counter.
 */
export async function searchOutside(term: string): Promise<CounterSearchResult[]> {
  const query = term.trim();
  if (query.length < 1) return [];
  const result = await listVariants({ search: query, status: "active", limit: 20 });
  return result.data
    .map(toResult)
    .filter((item) => !isSellable(item))
    .slice(0, 8);
}

export interface OutsideBuyInput {
  variantId: number;
  quantity: number;
  /** Per base unit, what the other shop charges. */
  cost: number;
  /** Per base unit, what this shop will charge for it. */
  price: number;
  /** The shop it came from. Required: the money goes on their account. */
  supplierId: number;
}

export type OutsideBuyResult =
  | { status: "ok"; item: CounterSearchResult }
  | { status: "error"; message: string };

/**
 * A medicine fetched from another shop, taken in and sold in one go.
 *
 * It is an ordinary delivery underneath — a batch with its cost, the amount
 * left on that shop's account — so stock, profit and what is owed all stay
 * true without anyone revisiting it later. Writing it up in the stock pages
 * while a customer waits was the thing nobody had time for.
 */
export async function buyInForCounter(
  input: OutsideBuyInput,
): Promise<OutsideBuyResult> {
  const t = await getT();
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { status: "error", message: t("pos.outsideQtyInvalid") };
  }

  let baseUnit: string;
  try {
    baseUnit = (await getVariant(input.variantId)).baseUnit;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : t("common.refresh"),
    };
  }

  const received = await receiveStock({
    supplier_id: input.supplierId,
    note: t("pos.outsideNote"),
    // On their account by the shop's own choosing, and a cashier could not
    // hand money over anyway.
    paid_amount: 0,
    paid_method: "cash",
    items: [
      {
        variant_id: input.variantId,
        quantity: input.quantity,
        unit_cost: input.cost,
        sell_prices: [{ unit_name: baseUnit, qty_in_base: 1, price: input.price }],
      },
    ],
  });

  if (received.status === "rejected") {
    return { status: "error", message: received.problems[0].message };
  }
  if (received.status === "error") {
    return { status: "error", message: received.message };
  }

  const item = toResult(await getVariant(input.variantId));
  return isSellable(item)
    ? { status: "ok", item }
    : { status: "error", message: t("pos.outsideNotReady") };
}
