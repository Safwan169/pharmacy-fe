"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { listCustomers } from "@/lib/api/customers";
import type { Customer, DuePayment } from "@/types";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name.").max(100, "Keep the name under 100 letters."),
  phone: z.string().trim().max(20, "That phone number is too long.").optional(),
  address: z.string().trim().max(255).optional(),
});

function reasonMessage(error: ApiError): string {
  const reason = (error.body as { reason?: string } | null)?.reason;
  switch (reason) {
    case "phone_taken":
      return "Someone already has that phone number. Search for them instead.";
    case "has_due":
      return "They still owe money. Collect it before deactivating them.";
    case "overpayment":
      return "That's more than they owe. Enter the amount owed or less.";
    default:
      return error.message;
  }
}

export async function searchCustomers(term: string): Promise<Customer[]> {
  const result = await listCustomers({ search: term.trim() || undefined, limit: 15 });
  return result.data;
}

export async function quickAddCustomer(name: string, phone: string): Promise<{ customer?: Customer; error?: string }> {
  const parsed = customerSchema.safeParse({ name, phone });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const customer = await apiFetch<Customer>("/customers", {
      method: "POST",
      auth: true,
      body: { name: parsed.data.name, phone: parsed.data.phone || undefined },
    });
    revalidatePath("/customers");
    return { customer };
  } catch (error) {
    if (error instanceof ApiError) return { error: reasonMessage(error) };
    throw error;
  }
}

export interface CustomerFormState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function saveCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const id = Number(formData.get("customer_id") ?? 0);
  const parsed = customerSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message };
  const body: Record<string, unknown> = {
    name: parsed.data.name,
    phone: parsed.data.phone || (id ? null : undefined),
    address: parsed.data.address || (id ? null : undefined),
  };
  try {
    await apiFetch<Customer>(id ? `/customers/${id}` : "/customers", {
      method: id ? "PATCH" : "POST",
      auth: true,
      body,
    });
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
  revalidatePath("/customers");
  if (id) revalidatePath(`/customers/${id}`);
  return { status: "success", message: id ? "Saved." : `${parsed.data.name} added.` };
}

export interface PaymentState {
  status: "idle" | "success" | "error";
  message?: string;
  payment?: DuePayment;
}

/** Money received against a customer's balance. */
export async function receiveDuePayment(_prev: PaymentState, formData: FormData): Promise<PaymentState> {
  const customerId = Number(formData.get("customer_id"));
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const method = String(formData.get("method") ?? "cash");
  const trx = String(formData.get("bkash_trx_id") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!Number.isInteger(customerId) || customerId < 1) {
    return { status: "error", message: "Reload the page and try again." };
  }
  if (!(amount > 0)) return { status: "error", message: "Enter the amount received." };
  if (method !== "cash" && method !== "bkash") return { status: "error", message: "Pick cash or bKash." };
  try {
    const payment = await apiFetch<DuePayment>(`/customers/${customerId}/payments`, {
      method: "POST",
      auth: true,
      body: {
        amount: Math.round(amount * 100) / 100,
        method,
        ...(trx ? { bkash_trx_id: trx } : {}),
        ...(note ? { note } : {}),
      },
    });
    revalidatePath("/customers");
    revalidatePath("/customers/due");
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/dashboard");
    return {
      status: "success",
      message: `Received. Balance left: ${payment.balanceAfter.toFixed(2)}.`,
      payment,
    };
  } catch (error) {
    if (error instanceof ApiError) return { status: "error", message: reasonMessage(error) };
    throw error;
  }
}
