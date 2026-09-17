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
