"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { bulkPrice, type BulkPricePreview } from "@/lib/api/catalogue";
import { getT } from "@/i18n/server";

export interface BulkPriceState {
  status: "idle" | "preview" | "applied" | "error";
  message?: string;
  preview?: BulkPricePreview;
}

/** Two-step: "preview" reports what would change; "apply" does it. */
export async function runBulkPrice(_prev: BulkPriceState, formData: FormData): Promise<BulkPriceState> {
  const t = await getT();
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const apply = text("intent") === "apply";
  const mode = text("mode") === "amount" ? "amount" : "percent";
  const value = Number(text("value"));
  const manufacturerId = Number(text("manufacturer_id")) || undefined;
  const genericId = Number(text("generic_id")) || undefined;
  const search = text("search") || undefined;
  const roundTo = Number(text("round_to")) || 0.5;

  if (!manufacturerId && !genericId && !search) return { status: "error", message: t("bulk.errFilter") };
  if (!Number.isFinite(value) || value === 0) return { status: "error", message: t("bulk.errValue") };

  try {
    const preview = await bulkPrice({
      manufacturer_id: manufacturerId,
      generic_id: genericId,
      search,
      ...(mode === "percent" ? { percent: value } : { amount: value }),
      round_to: roundTo,
      dry_run: !apply,
    });
    if (apply) {
      revalidatePath("/catalogue");
      revalidatePath("/pos");
      return { status: "applied", preview, message: t("bulk.applied", { variants: preview.variants, prices: preview.unit_prices }) };
    }
    return { status: "preview", preview };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
}
