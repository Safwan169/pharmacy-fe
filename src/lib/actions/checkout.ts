"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { checkoutRejectionSummary, humaniseCheckoutFailure } from "@/lib/messages";
import type { CheckoutItemFailure, DiscountType, Sale } from "@/types";

export interface CheckoutRequest {
  items: { variant_id: number; unit_id: number; quantity: number; name: string }[];
  discount?: { type: DiscountType; value: number };
}

export type CheckoutResult =
  | { status: "success"; sale: Sale }
  | {
      status: "rejected";
      summary: string;
      /** One readable line per problem item, aligned to the basket. */
      problems: { variantId: number; message: string }[];
    }
  | { status: "error"; message: string };

/**
 * Submits the whole basket in one request.
 *
 * The API is all-or-nothing: if any line can't be sold, nothing is charged and
 * no stock moves. It returns a reason per line so the counter can fix the
 * basket without looking anything up — those reasons are translated here into
 * sentences that say what to do about each one.
 */
export async function checkout(request: CheckoutRequest): Promise<CheckoutResult> {
  if (request.items.length === 0) {
    return {
      status: "error",
      message: "The basket is empty. Add at least one item before taking payment.",
    };
  }

  const names = new Map(request.items.map((i) => [i.variant_id, i.name]));

  try {
    const sale = await apiFetch<Sale>("/sales/checkout", {
      method: "POST",
      auth: true,
      body: {
        items: request.items.map(({ variant_id, unit_id, quantity }) => ({
          variant_id,
          unit_id,
          quantity,
        })),
        ...(request.discount ? { discount: request.discount } : {}),
      },
    });

    // Stock moved and a sale exists, so anything showing either is now stale.
    revalidatePath("/dashboard");
    revalidatePath("/sales");
    revalidatePath("/catalogue");
    revalidatePath("/pricing");

    return { status: "success", sale };
  } catch (error) {
    if (error instanceof ApiError) {
      const failures = extractFailures(error.body);

      if (failures.length > 0) {
        return {
          status: "rejected",
          summary: checkoutRejectionSummary(failures.length),
          problems: failures.map((failure) => ({
            variantId: failure.variant_id,
            message: humaniseCheckoutFailure(failure, names.get(failure.variant_id)),
          })),
        };
      }

      return { status: "error", message: error.message };
    }
    throw error;
  }
}

function extractFailures(body: unknown): CheckoutItemFailure[] {
  if (body === null || typeof body !== "object") return [];
  const errors = (body as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as CheckoutItemFailure[]) : [];
}
