import "server-only";

import { apiFetch, buildQuery } from "./client";
import type {
  MovementType,
  Paginated,
  StockMovement,
  StockReceipt,
  Supplier,
} from "@/types";

export function listSuppliers(
  params: { search?: string; status?: string; page?: number; limit?: number } = {},
) {
  return apiFetch<Paginated<Supplier>>(`/suppliers${buildQuery(params)}`, { auth: true });
}

export function getSupplier(id: number) {
  return apiFetch<Supplier>(`/suppliers/${id}`, { auth: true });
}

export interface ReceiptFilters {
  search?: string;
  supplier_id?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function listReceipts(filters: ReceiptFilters = {}) {
  return apiFetch<Paginated<StockReceipt>>(`/stock/receipts${buildQuery(filters)}`, {
    auth: true,
  });
}

export function getReceipt(id: number) {
  return apiFetch<StockReceipt>(`/stock/receipts/${id}`, { auth: true });
}

export interface MovementFilters {
  variant_id?: number;
  type?: MovementType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function listMovements(filters: MovementFilters = {}) {
  return apiFetch<Paginated<StockMovement>>(`/stock/movements${buildQuery(filters)}`, {
    auth: true,
  });
}
