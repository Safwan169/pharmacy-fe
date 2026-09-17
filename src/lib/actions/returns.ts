"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { RefundMethod, Sale } from "@/types";

export interface VoidState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Reverses a whole sale made today. Stock goes back to the batches it came from. */
export async function voidSale(_prev: VoidState, formData: FormData): Promise<VoidState> {
  const saleId = Number(formData.get("sale_id"));
  const reason = String(formData.get("reason") ?? "").trim();
  if (!Number.isInteger(saleId) || saleId < 1) {
    return { status: "error", message: "We couldn't tell which sale to void. Reload the page." };
  }
  if (!reason) {
    return { status: "error", message: "Say why the sale is being voided — it's kept in the record." };
  }
  try {
    await apiFetch<Sale>(`/sales/${saleId}/void`, { method: "POST", auth: true, body: { reason } });
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: humaniseConflict(error) };
    }
    throw error;
  }
  revalidateSale(saleId);
  return { status: "success", message: "Voided. The stock is back on the shelf and the sale no longer counts towards earnings." };
}

export interface ReturnRequest {
  saleId: number;
  items: { sale_item_id: number; quantity: number; restock: boolean }[];
  refund_method: RefundMethod;
  reason?: string;
}

export type ReturnResult =
  | { status: "success"; sale: Sale; returnNumber: string; refundAmount: number }
  | { status: "rejected"; problems: { saleItemId: number; message: string }[] }
  | { status: "error"; message: string };

interface LineFailure {
  sale_item_id: number;
  reason: string;
  message: string;
  returnable_quantity?: number;
}

export async function returnItems(request: ReturnRequest): Promise<ReturnResult> {
  if (request.items.length === 0) {
    return { status: "error", message: "Pick at least one item to take back." };
  }
  try {
    const sale = await apiFetch<Sale>(`/sales/${request.saleId}/returns`, {
      method: "POST",
      auth: true,
      body: {
        items: request.items,
        refund_method: request.refund_method,
        ...(request.reason ? { reason: request.reason } : {}),
      },
    });
    revalidateSale(request.saleId);
    const latest = [...(sale.returns ?? [])].sort((a, b) => b.id - a.id)[0];
    return {
      status: "success",
      sale,
      returnNumber: latest?.returnNumber ?? "",
      refundAmount: latest?.refundAmount ?? 0,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = (error.body as { errors?: LineFailure[] } | null)?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return {
          status: "rejected",
          problems: errors.map((f) => ({
            saleItemId: f.sale_item_id,
            message:
              f.reason === "too_many"
                ? `Only ${f.returnable_quantity ?? 0} can still be returned on this line.`
                : f.reason === "sale_item_not_found"
                  ? "That line isn't part of this sale."
                  : f.message,
          })),
        };
      }
      return { status: "error", message: humaniseConflict(error) };
    }
    throw error;
  }
}

function humaniseConflict(error: ApiError): string {
  const reason = (error.body as { reason?: string } | null)?.reason;
  switch (reason) {
    case "void_window_closed":
      return "This sale wasn't made today, so it can't be voided any more. Use “Return items” instead.";
    case "not_voidable":
      return "This sale has already been voided or had items returned.";
    case "not_returnable":
      return "Nothing on this sale can be returned — it was voided or everything is already back.";
    default:
      return error.message;
  }
}

function revalidateSale(saleId: number) {
  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/catalogue");
  revalidatePath("/stock/movements");
}
