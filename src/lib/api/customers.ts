import "server-only";

import { apiFetch, buildQuery } from "./client";
import type { Customer, DueCustomer, DuePayment, Paginated, Sale, ShopSettings } from "@/types";

export function listCustomers(params: { search?: string; has_due?: boolean; page?: number; limit?: number } = {}) {
  return apiFetch<Paginated<Customer>>(`/customers${buildQuery(params)}`, { auth: true });
}

export function getCustomer(id: number) {
  return apiFetch<Customer>(`/customers/${id}`, { auth: true });
}

export function getCustomerHistory(id: number) {
  return apiFetch<{ sales: Sale[]; payments: DuePayment[] }>(`/customers/${id}/history`, { auth: true });
}

export function getDueList() {
  return apiFetch<DueCustomer[]>("/customers/due", { auth: true });
}

export function getSettings() {
  return apiFetch<ShopSettings>("/settings", { auth: true });
}
