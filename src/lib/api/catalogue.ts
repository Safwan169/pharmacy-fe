import "server-only";

import { apiFetch, buildQuery } from "./client";
import type {
  Generic,
  Manufacturer,
  Paginated,
  Product,
  ProductVariant,
  UnitTemplate,
  VariantBarcode,
} from "@/types";

export interface VariantFilters {
  search?: string;
  manufacturer_id?: number;
  generic_id?: number;
  dosage_form?: string;
  type?: string;
  pricing_status?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/** The main catalogue search, and the pricing worklist when `pricing_status=missing`. */
export function listVariants(filters: VariantFilters = {}) {
  return apiFetch<Paginated<ProductVariant>>(`/variants${buildQuery(filters)}`);
}

/** Most-sold medicines, for the counter's tiles. */
export function getFavourites(params: { limit?: number; days?: number } = {}) {
  return apiFetch<ProductVariant[]>(`/variants/favourites${buildQuery(params)}`, { auth: true });
}

/** The medicine a scanned code opens, and the pack it is printed on. */
export function getVariantByBarcode(code: string) {
  return apiFetch<{ unit_id: number | null; variant: ProductVariant }>(
    `/variants/by-barcode/${encodeURIComponent(code)}`,
    { auth: true },
  );
}

export function addVariantBarcode(
  id: number,
  body: { code: string; unit_id?: number; note?: string },
) {
  return apiFetch<{ id: number; code: string }>(`/variants/${id}/barcodes`, {
    method: "POST",
    auth: true,
    body,
  });
}

export function listVariantBarcodes(id: number) {
  return apiFetch<VariantBarcode[]>(`/variants/${id}/barcodes`, { auth: true });
}

export function deleteVariantBarcode(id: number, barcodeId: number) {
  return apiFetch<void>(`/variants/${id}/barcodes/${barcodeId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function getVariant(id: number) {
  return apiFetch<ProductVariant>(`/variants/${id}`);
}

/** Apply a parked price change now, or drop it. */
export function resolvePendingPrice(id: number, intent: "apply" | "cancel") {
  return apiFetch<void>(intent === "apply" ? `/variants/${id}/pending-price/apply` : `/variants/${id}/pending-price`, {
    method: intent === "apply" ? "POST" : "DELETE",
    auth: true,
  });
}

/** Suggested unit ladder for a SKU that hasn't been set up yet. */
export function getUnitTemplate(params: { dosage_form: string; pack_size?: number | null }) {
  return apiFetch<UnitTemplate>(
    `/variants/unit-templates${buildQuery({
      dosage_form: params.dosage_form,
      ...(params.pack_size ? { pack_size: params.pack_size } : {}),
    })}`,
  );
}

export interface NewVariantInput {
  brand_name: string;
  manufacturer_name: string;
  generic_name?: string;
  type?: "allopathic" | "herbal";
  dosage_form: string;
  strength?: string;
  pack_size?: number;
}

/** Adds a medicine the imported catalogue doesn't have. Owner only. */
export function createVariant(body: NewVariantInput) {
  return apiFetch<ProductVariant>("/variants", { method: "POST", auth: true, body });
}

export interface BulkPriceInput {
  manufacturer_id?: number;
  generic_id?: number;
  search?: string;
  percent?: number;
  amount?: number;
  round_to?: number;
  dry_run: boolean;
}

export interface BulkPricePreview {
  dry_run: boolean;
  variants: number;
  unit_prices: number;
  sample: { variant_id: number; name: string; unit: string; old_price: number; new_price: number }[];
}

/** Preview (dry_run) or apply a price change across many medicines. Owner only. */
export function bulkPrice(body: BulkPriceInput) {
  return apiFetch<BulkPricePreview>("/variants/bulk-price", { method: "POST", auth: true, body });
}

export function listManufacturers(params: { search?: string; limit?: number } = {}) {
  return apiFetch<Paginated<Manufacturer>>(`/manufacturers${buildQuery(params)}`);
}

export function listGenerics(params: { search?: string; limit?: number } = {}) {
  return apiFetch<Paginated<Generic>>(`/generics${buildQuery(params)}`);
}

/** Every company / ingredient, for dropdowns — the API allows up to 5000 here. */
export const LOOKUP_LIMIT = 5000;

/**
 * Held for five minutes, because these two lists sit beside a search box and
 * would otherwise be fetched again — ten thousand rows of them — on every
 * letter typed. A new medicine drops them at once through the tag, so the
 * dropdowns never lag behind what the shop just added.
 */
export const LOOKUP_TAG = "catalogue-lookups";
const LOOKUP_CACHE = { seconds: 300, tag: LOOKUP_TAG };

export function listAllManufacturers() {
  return apiFetch<Paginated<Manufacturer>>(
    `/manufacturers${buildQuery({ limit: LOOKUP_LIMIT })}`,
    { cacheFor: LOOKUP_CACHE },
  ).then((r) => r.data);
}

export function listAllGenerics() {
  return apiFetch<Paginated<Generic>>(
    `/generics${buildQuery({ limit: LOOKUP_LIMIT })}`,
    { cacheFor: LOOKUP_CACHE },
  ).then((r) => r.data);
}

/** Alternative brands built on the same active ingredient. */
export function listGenericVariants(
  genericId: number,
  params: { page?: number; limit?: number } = {},
) {
  return apiFetch<Paginated<ProductVariant>>(
    `/generics/${genericId}/variants${buildQuery(params)}`,
  );
}

export function listProducts(
  params: {
    search?: string;
    manufacturer_id?: number;
    type?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  return apiFetch<Paginated<Product>>(`/products${buildQuery(params)}`);
}

export function getProduct(id: number) {
  return apiFetch<Product>(`/products/${id}`);
}
