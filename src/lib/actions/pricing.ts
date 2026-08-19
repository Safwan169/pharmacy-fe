"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { pricingSchema } from "@/lib/validations";
import type { ProductVariant } from "@/types";

export interface PricingState {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: { price?: string; stock_quantity?: string };
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
  const variantId = Number(formData.get("variant_id"));
  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: "We couldn't tell which item to update. Please reload the page." };
  }

  const parsed = pricingSchema.safeParse({
    price: formData.get("price") ?? "",
    stock_quantity: formData.get("stock_quantity") ?? "",
  });

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return {
      status: "error",
      errors: {
        price: fieldErrors.price?.[0],
        stock_quantity: fieldErrors.stock_quantity?.[0],
      },
    };
  }

  const body: { price?: number; stock_quantity?: number } = {};
  if (parsed.data.price !== "" && parsed.data.price !== undefined) {
    body.price = parsed.data.price;
  }
  if (parsed.data.stock_quantity !== "" && parsed.data.stock_quantity !== undefined) {
    body.stock_quantity = parsed.data.stock_quantity;
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
    message: describeSaved(body),
  };
}

/** Confirms exactly what changed, so nobody has to guess whether it saved. */
function describeSaved(body: { price?: number; stock_quantity?: number }): string {
  const hasPrice = body.price !== undefined;
  const hasStock = body.stock_quantity !== undefined;

  if (hasPrice && hasStock) return "Saved. Price and stock are both up to date.";
  if (hasPrice) return "Saved. The new price is now in use.";
  return "Saved. The stock count is up to date.";
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

  if (!Number.isInteger(variantId) || variantId < 1) {
    return { status: "error", message: "We couldn't tell which item to update. Please reload the page." };
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
      ? "Withdrawn from sale. It won't appear in search or the counter, and it can't be sold — but its price, stock and past sales are all kept."
      : "Back on sale. It will appear in search and can be sold again.",
  };
}
