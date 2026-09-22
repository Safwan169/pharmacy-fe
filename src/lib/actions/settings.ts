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
