import "server-only";

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
