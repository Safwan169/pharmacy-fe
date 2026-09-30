"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { DayClosingSummary } from "@/types";
import { getT } from "@/i18n/server";

export interface CloseDayState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Records what the drawer actually held tonight, which is what tomorrow's
 * opening balance is built from. The shortfall is not asked for — it is
 * counted minus expected, and typing it would only invite a number that
 * balances rather than one that is true.
 */
export async function closeDay(_prev: CloseDayState, formData: FormData): Promise<CloseDayState> {
  const t = await getT();
  const date = String(formData.get("date") ?? "");
  const counted = String(formData.get("counted_cash") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(counted)) {
    return { status: "error", message: t("closeDay.countedNumber") };
  }
  try {
    await apiFetch<DayClosingSummary>("/reports/daily-closing/close", {
      method: "POST",
      auth: true,
      body: { date, counted_cash: Number(counted), ...(note ? { note } : {}) },
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/reports/daily-closing");
  // The dashboard carries the same card, and it is where the count is
  // usually taken from.
  revalidatePath("/dashboard");
  return { status: "success", message: t("closeDay.saved") };
}
