"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { BackupFile, ShopSettings } from "@/types";
import { getT } from "@/i18n/server";

export interface SettingsState {
  status: "idle" | "success" | "error";
  message?: string;
}

const KEYS: (keyof ShopSettings)[] = [
  "shop_name",
  "shop_address",
  "shop_phone",
  "drug_license_no",
  "receipt_footer",
  "low_stock_threshold",
  "receipt_width_mm",
  "default_markup_percent",
  "opening_cash",
];

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const t = await getT();
  const body: Partial<ShopSettings> = {};
  for (const key of KEYS) {
    const value = formData.get(key);
    if (typeof value === "string") body[key] = value.trim();
  }
  if (!body.shop_name) return { status: "error", message: t("settingsAction.nameRequired") };
  if (body.low_stock_threshold && !/^\d{1,6}$/.test(body.low_stock_threshold)) {
    return { status: "error", message: t("settingsAction.lowStockInteger") };
  }
  if (body.default_markup_percent && !/^\d{1,3}(\.\d{1,2})?$/.test(body.default_markup_percent)) {
    return { status: "error", message: t("settingsAction.markupNumber") };
  }
  if (body.opening_cash && !/^\d{1,8}(\.\d{1,2})?$/.test(body.opening_cash)) {
    return { status: "error", message: t("settingsAction.openingCashNumber") };
  }
  try {
    await apiFetch<ShopSettings>("/settings", { method: "PATCH", auth: true, body });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { status: "success", message: t("settingsAction.saved") };
}

export interface BackupState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Runs pg_dump on the API server and lists the new file. */
export async function runBackup(_prev: BackupState): Promise<BackupState> {
  const t = await getT();
  try {
    const file = await apiFetch<BackupFile>("/admin/backup", { method: "POST", auth: true });
    revalidatePath("/settings");
    return { status: "success", message: t("settingsAction.backedUp", { name: file.name, size: (file.size_bytes / 1024).toFixed(0) }) };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
}

export interface OpeningCostState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** One-off: costs stock that came in without a cost, at selling price less a percent. */
export async function costOpeningStock(_prev: OpeningCostState, formData: FormData): Promise<OpeningCostState> {
  const t = await getT();
  const raw = String(formData.get("percent") ?? "").trim();
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(raw)) return { status: "error", message: t("openingCost.errPercent") };
  try {
    const result = await apiFetch<{ batches_costed: number; value_at_cost: number; batches_skipped: number }>(
      "/stock/opening-cost",
      { method: "POST", auth: true, body: { percent_below_price: Number(raw) } },
    );
    revalidatePath("/reports", "layout");
    revalidatePath("/catalogue", "layout");
    if (result.batches_costed === 0) return { status: "success", message: t("openingCost.nothing") };
    const done = t("openingCost.done", { count: result.batches_costed, value: result.value_at_cost.toFixed(2) });
    return {
      status: "success",
      message: result.batches_skipped > 0 ? `${done} ${t("openingCost.skipped", { count: result.batches_skipped })}` : done,
    };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
}
