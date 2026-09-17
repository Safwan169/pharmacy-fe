"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { checkoutRejectionSummary, humaniseCheckoutFailure } from "@/lib/messages";
import type { CheckoutItemFailure, DiscountType, PaymentMethod, Sale } from "@/types";

export interface CheckoutRequest {
  items: { variant_id: number; unit_id: number; quantity: number; name: string }[];
  discount?: { type: DiscountType; value: number };
  payment_method: PaymentMethod;
  amount_tendered?: number;
  bkash_trx_id?: string;
  customer_id?: number;
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
        payment_method: request.payment_method,
        ...(request.amount_tendered !== undefined ? { amount_tendered: request.amount_tendered } : {}),
        ...(request.bkash_trx_id ? { bkash_trx_id: request.bkash_trx_id } : {}),
        ...(request.customer_id !== undefined ? { customer_id: request.customer_id } : {}),
      },
    });

    // Stock moved and a sale exists, so anything showing either is now stale.
    revalidatePath("/dashboard");
    revalidatePath("/sales");
    revalidatePath("/catalogue");
    revalidatePath("/pricing");
    revalidatePath("/customers");
    revalidatePath("/customers/due");

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

      const reason = (error.body as { reason?: string } | null)?.reason;
      const message =
        reason === "tendered_short"
          ? "The cash given is less than the total. Enter what they actually handed over."
          : reason === "customer_required"
            ? "A due sale needs a customer. Pick one or add them."
            : reason === "customer_not_found"
              ? "That customer no longer exists. Pick another."
              : error.message;
      return { status: "error", message };
    }
    throw error;
  }
}

function extractFailures(body: unknown): CheckoutItemFailure[] {
  if (body === null || typeof body !== "object") return [];
  const errors = (body as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as CheckoutItemFailure[]) : [];
}
