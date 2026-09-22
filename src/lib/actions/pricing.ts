"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { resolvePendingPrice } from "@/lib/api/catalogue";
import { pricingSchema, unitsSchema } from "@/lib/validations";
import type { ProductVariant } from "@/types";
import { issueText } from "@/lib/messages";
import { getT } from "@/i18n/server";
import type { Translate } from "@/i18n";

export interface PricingState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: { price?: string; stock_quantity?: string; units?: string; reorder_level?: string; mrp?: string };
}

/**
 * Sets price and/or stock on one SKU.
 *
 * A blank field means "leave this alone" — the API treats an absent key that
 * way, and it's how a restock avoids re-sending an unchanged price. Sending
 * `0` is a real value: confirmed out of stock.
 */
export async function updatePricing(
  _prev: PricingState,
  formData: FormData,
): Promise<PricingState> {
  const t = await getT();
  const variantId = Number(formData.get("variant_id"));
  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: t("action.reload") };
  }

  // The unit ladder arrives as JSON from the client editor; stock as a plain field.
  const rawUnits = formData.get("units");
  const unitsChanged = formData.get("units_changed") === "1";
  const body: {
    price?: number;
    stock_quantity?: number;
    stock_note?: string;
    reorder_level?: number | null;
    mrp?: number | null;
    units?: Array<{
      name: string;
      qty_in_base: number;
      price: number | null;
      is_sellable: boolean;
      is_default: boolean;
    }>;
  } = {};

  if (unitsChanged && typeof rawUnits === "string" && rawUnits !== "") {
    let decoded: unknown;
    try {
      decoded = JSON.parse(rawUnits);
    } catch {
      return { status: "error", message: t("action.reload") };
    }
    const units = unitsSchema.safeParse(decoded);
    if (!units.success) {
      return { status: "error", errors: { units: issueText(t, units.error.issues[0]?.message) } };
    }
    body.units = units.data;
  }

  const stockNote = String(formData.get("stock_note") ?? "").trim();
  const parsed = pricingSchema.safeParse({
    price: "",
    stock_quantity: formData.get("stock_quantity") ?? "",
  });

  if (!parsed.success && body.units === undefined) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      status: "error",
      errors: {
        stock_quantity: issueText(t, fieldErrors.stock_quantity?.[0]),
        units: fieldErrors.price?.[0] ? t("pricingAction.nothingToSave") : undefined,
      },
    };
  }
  if (parsed.success && parsed.data.stock_quantity !== "" && parsed.data.stock_quantity !== undefined) {
    body.stock_quantity = parsed.data.stock_quantity;
    if (stockNote) body.stock_note = stockNote;
  } else if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    if (fieldErrors.stock_quantity?.[0]) {
      return { status: "error", errors: { stock_quantity: issueText(t, fieldErrors.stock_quantity[0]) } };
    }
  }

  // Blank means "use the shop-wide number"; it is only sent when it changed.
  const reorderRaw = String(formData.get("reorder_level") ?? "").trim();
  const reorderWas = String(formData.get("reorder_level_was") ?? "").trim();
  if (reorderRaw !== reorderWas) {
    if (reorderRaw === "") body.reorder_level = null;
    else if (/^\d{1,7}$/.test(reorderRaw)) body.reorder_level = Number(reorderRaw);
    else return { status: "error", errors: { reorder_level: t("pricingAction.reorderInteger") } };
  }

  // The printed MRP, which the company (or the government) revises from time
  // to time. Only sent when it changed.
  const mrpRaw = String(formData.get("mrp") ?? "").trim();
  const mrpWas = String(formData.get("mrp_was") ?? "").trim();
  if (mrpRaw !== mrpWas) {
    if (mrpRaw === "") body.mrp = null;
    else if (/^\d{1,8}(\.\d{1,2})?$/.test(mrpRaw)) body.mrp = Number(mrpRaw);
    else return { status: "error", errors: { mrp: t("pricingAction.mrpNumber") } };
  }

  if (
    body.units === undefined &&
    body.stock_quantity === undefined &&
    body.reorder_level === undefined &&
    body.mrp === undefined
  ) {
    return {
      status: "error",
      errors: { units: t("pricingAction.nothingToSave") },
    };
  }

  try {
    await apiFetch<ProductVariant>(`/variants/${variantId}/pricing`, {
      method: "PATCH",
      body,
      auth: true,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/pricing");
  revalidatePath("/catalogue");
  revalidatePath("/dashboard");
  revalidatePath(`/catalogue/${variantId}`);

  return {
    status: "success",
    message: describeSaved(body, t),
  };
}

/** Confirms exactly what changed, so nobody has to guess whether it saved. */
function describeSaved(
  body: { price?: number; stock_quantity?: number; units?: unknown; reorder_level?: number | null },
  t: Translate,
): string {
  const hasPrice = body.price !== undefined || body.units !== undefined;
  const hasStock = body.stock_quantity !== undefined;

  if (hasPrice && hasStock) return t("pricingAction.savedBoth");
  if (hasPrice) return t("pricingAction.savedUnits");
  if (hasStock) return t("pricingAction.savedStock");
  return t("pricingAction.savedReorder");
}

export interface WriteOffState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Zeroes an expired (or damaged) batch and records the write-off. */
export async function writeOffBatch(
  _prev: WriteOffState,
  formData: FormData,
): Promise<WriteOffState> {
  const batchId = Number(formData.get("batch_id"));
  const variantId = Number(formData.get("variant_id"));
  const note = String(formData.get("note") ?? "").trim();
  const t = await getT();
  if (!Number.isInteger(batchId) || batchId < 1) {
    return { status: "error", message: t("action.reload") };
  }
  try {
    await apiFetch(`/stock/batches/${batchId}/write-off`, {
      method: "POST",
      auth: true,
      body: note ? { note } : {},
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/dashboard");
  revalidatePath("/stock/expiring");
  revalidatePath("/catalogue");
  if (variantId) revalidatePath(`/catalogue/${variantId}`);
  return { status: "success", message: t("pricingAction.writtenOff") };
}

export interface AvailabilityState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Withdraws a SKU from sale, or puts it back. Never deletes: past invoices
 * point at these rows, so the API only ever flips a flag.
 */
export async function setVariantAvailability(
  _prev: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const variantId = Number(formData.get("variant_id"));
  const intent = formData.get("intent");
  const t = await getT();

  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: t("action.reload") };
  }

  const withdrawing = intent === "withdraw";

  try {
    await apiFetch<ProductVariant>(
      withdrawing ? `/variants/${variantId}` : `/variants/${variantId}/restore`,
      { method: withdrawing ? "DELETE" : "POST", auth: true },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath(`/catalogue/${variantId}`);

  return {
    status: "success",
    message: withdrawing
      ? t("pricingAction.withdrawn")
      : t("pricingAction.restored"),
  };
}

export interface PendingPriceState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Owner decides not to wait for the old stock — or drops the change. */
export async function resolvePending(_prev: PendingPriceState, formData: FormData): Promise<PendingPriceState> {
  const variantId = Number(formData.get("variant_id"));
  const intent = formData.get("intent") === "apply" ? "apply" : "cancel";
  const t = await getT();
  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: t("action.reload") };
  }
  try {
    await resolvePendingPrice(variantId, intent);
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/catalogue");
  revalidatePath("/pricing");
  revalidatePath("/pos");
  revalidatePath(`/catalogue/${variantId}`);
  return { status: "success", message: t(intent === "apply" ? "pending.applied" : "pending.cancelled") };
}
