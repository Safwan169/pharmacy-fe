import "server-only";

import { apiFetch, buildQuery } from "./client";
import type { DashboardSummary, LowStockItem, Paginated, Sale } from "@/types";

export function listSales(
  params: {
    search?: string;
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
