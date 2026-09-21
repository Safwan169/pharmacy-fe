import "server-only";

import type { AuditEntry, Paginated } from "@/types";

import { apiFetch, buildQuery } from "./client";
import type { BackupFile, DailyClosing, ProfitReport, StockValue } from "@/types";

export function getDailyClosing(date?: string) {
  return apiFetch<DailyClosing>(`/reports/daily-closing${buildQuery(date ? { date } : {})}`, { auth: true });
}

export function getProfit(from: string, to: string) {
  return apiFetch<ProfitReport>(`/reports/profit${buildQuery({ from, to })}`, { auth: true });
}

export function getStockValue() {
  return apiFetch<StockValue>("/reports/stock-value", { auth: true });
}

export function listBackups() {
  return apiFetch<{ dir: string; files: BackupFile[] }>("/admin/backups", { auth: true });
}

/** Owner-level changes, newest first; optionally just one record's history. */
export function listAudit(params: { entity_type?: string; entity_id?: number; page?: number; limit?: number } = {}) {
  return apiFetch<Paginated<AuditEntry>>(`/audit${buildQuery(params)}`, { auth: true });
}
