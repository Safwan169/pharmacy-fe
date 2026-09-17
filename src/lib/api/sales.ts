import "server-only";

import { apiFetch, buildQuery } from "./client";
import type {
  DashboardSummary,
  ExpiringItem,
  ExpiryWindow,
  LowStockItem,
  Paginated,
  Sale,
} from "@/types";

export function listSales(
  params: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  return apiFetch<Paginated<Sale>>(`/sales${buildQuery(params)}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getSale(id: number) {
  return apiFetch<Sale>(`/sales/${id}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

/** Batches with stock that expire within the window, soonest first. */
export function getExpiring(days: ExpiryWindow = 30) {
  return apiFetch<ExpiringItem[]>(`/stock/expiring${buildQuery({ days })}`, { auth: true });
}

/** Batches already past their date that still hold stock. */
export function getExpired() {
  return apiFetch<ExpiringItem[]>("/stock/expired", { auth: true });
}

export function getLowStock() {
  return apiFetch<LowStockItem[]>("/dashboard/low-stock", {
    auth: true,
    redirectOnUnauthorized: true,
  });
}

export function getSummary(params: { period?: string; from?: string; to?: string }) {
  return apiFetch<DashboardSummary>(`/dashboard/summary${buildQuery(params)}`, {
    auth: true,
    redirectOnUnauthorized: true,
  });
}
