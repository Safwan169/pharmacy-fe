import "server-only";

import { apiFetch, buildQuery } from "./client";
import type {
  Generic,
  Manufacturer,
  Paginated,
  Product,
  ProductVariant,
  UnitTemplate,
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

export function getVariant(id: number) {
  return apiFetch<ProductVariant>(`/variants/${id}`);
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
