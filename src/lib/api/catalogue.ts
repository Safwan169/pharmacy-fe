import "server-only";

import { apiFetch, buildQuery } from "./client";
import type {
  Generic,
  Manufacturer,
  Paginated,
  Product,
  ProductVariant,
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
