"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, ApiError } from "@/lib/api/client";
import { listSales } from "@/lib/api/sales";
import type { RefundMethod, Sale } from "@/types";
import { getT } from "@/i18n/server";
import type { Translate } from "@/i18n";

export interface VoidState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Reverses a whole sale made today. Stock goes back to the batches it came from. */
export async function voidSale(_prev: VoidState, formData: FormData): Promise<VoidState> {
  const saleId = Number(formData.get("sale_id"));
  const reason = String(formData.get("reason") ?? "").trim();
  const t = await getT();
  if (!Number.isInteger(saleId) || saleId < 1) {
    return { status: "error", message: t("action.reload") };
  }
  if (!reason) {
    return { status: "error", message: t("returnAction.reasonRequired") };
  }
  try {
    await apiFetch<Sale>(`/sales/${saleId}/void`, { method: "POST", auth: true, body: { reason } });
  } catch (error) {
    if (error instanceof ApiError) {
      return { status: "error", message: humaniseConflict(error, t) };
    }
    throw error;
  }
  revalidateSale(saleId);
  return { status: "success", message: t("returnAction.voided") };
}

/**
 * Bills the counter could still take something back from. With no search it is
 * the past week, which covers almost every return; typing searches all of
 * history by medicine, customer or invoice number.
 */
export async function findSalesToReturn(search: string): Promise<Sale[]> {
  const term = search.trim();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const result = await listSales({
    limit: 20,
    with_items: true,
    ...(term === "" ? { from: weekAgo } : { search: term }),
  });
  // A voided or fully returned bill has nothing left to give back.
  return result.data.filter((sale) =>
    (sale.items ?? []).some((item) => item.quantity - item.returnedQuantity > 0),
  );
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
  const t = await getT();
  if (request.items.length === 0) {
    return { status: "error", message: t("returnAction.pickOne") };
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
                ? t("returnAction.tooMany", { count: f.returnable_quantity ?? 0 })
                : f.reason === "sale_item_not_found"
                  ? t("returnAction.lineNotFound")
                  : f.message,
          })),
        };
      }
      return { status: "error", message: humaniseConflict(error, t) };
    }
    throw error;
  }
}

function humaniseConflict(error: ApiError, t: Translate): string {
  const reason = (error.body as { reason?: string } | null)?.reason;
  switch (reason) {
    case "void_window_closed":
      return t("returnAction.windowClosed");
    case "not_voidable":
      return t("returnAction.notVoidable");
    case "not_returnable":
      return t("returnAction.notReturnable");
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
