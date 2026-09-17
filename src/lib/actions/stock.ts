"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { listVariants } from "@/lib/api/catalogue";
import { listSuppliers } from "@/lib/api/stock";
import type { StockReceipt, Supplier } from "@/types";

// ---------- Suppliers ----------

export interface SupplierState {
  status: "idle" | "success" | "error";
  message?: string;
  supplier?: Supplier;
}

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Enter the supplier's name.").max(150, "Keep the name under 150 letters."),
  phone: z.string().trim().max(30, "That phone number is too long.").optional(),
  address: z.string().trim().max(255, "Keep the address under 255 letters.").optional(),
});

export async function saveSupplier(_prev: SupplierState, formData: FormData): Promise<SupplierState> {
  const id = Number(formData.get("supplier_id") ?? 0);
  const parsed = supplierSchema.safeParse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }
  const body: Record<string, unknown> = {
    name: parsed.data.name,
    phone: parsed.data.phone || (id ? null : undefined),
    address: parsed.data.address || (id ? null : undefined),
  };
  const intent = formData.get("intent");
  if (intent === "deactivate") body.is_active = false;
  if (intent === "activate") body.is_active = true;

  try {
    const supplier = await apiFetch<Supplier>(id ? `/suppliers/${id}` : "/suppliers", {
      method: id ? "PATCH" : "POST",
      auth: true,
      body,
    });
    revalidatePath("/suppliers");
    revalidatePath("/stock/receive");
    return {
      status: "success",
      message: id ? "Saved." : `${supplier.name} added.`,
      supplier,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        status: "error",
        message:
          error.status === 409
            ? "A supplier with that name already exists. Pick it from the list instead."
            : error.message,
      };
    }
    throw error;
  }
}

/** Quick lookup for the receive form's supplier picker. */
export async function searchSuppliers(term: string): Promise<Supplier[]> {
  const result = await listSuppliers({ search: term.trim() || undefined, limit: 20 });
  return result.data;
}

/** Adds a supplier from inside the receive form. Returns the row or an error line. */
export async function quickAddSupplier(
  name: string,
  phone: string,
): Promise<{ supplier?: Supplier; error?: string }> {
  const parsed = supplierSchema.safeParse({ name, phone });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  try {
    const supplier = await apiFetch<Supplier>("/suppliers", {
      method: "POST",
      auth: true,
      body: { name: parsed.data.name, phone: parsed.data.phone || undefined },
    });
    revalidatePath("/suppliers");
    return { supplier };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        error:
          error.status === 409
            ? "A supplier with that name already exists. Search for it instead."
            : error.message,
      };
    }
    throw error;
  }
}

// ---------- Receive stock ----------

export interface ReceiveLineInput {
  variant_id: number;
  unit_id?: number;
  quantity: number;
  unit_cost: number;
  batch_no?: string;
  expiry_date?: string;
}

export interface ReceiveRequest {
  supplier_id?: number;
  supplier_invoice_no?: string;
  received_at?: string;
  note?: string;
  items: ReceiveLineInput[];
}

export type ReceiveResult =
  | { status: "success"; receipt: StockReceipt }
  | { status: "rejected"; problems: { index: number; message: string }[] }
  | { status: "error"; message: string };

interface LineFailure {
  index: number;
  variant_id: number;
  reason: string;
  message: string;
}

export async function receiveStock(request: ReceiveRequest): Promise<ReceiveResult> {
  if (request.items.length === 0) {
    return { status: "error", message: "Add at least one line before saving the delivery." };
  }
  try {
    const receipt = await apiFetch<StockReceipt>("/stock/receipts", {
      method: "POST",
      auth: true,
      body: request,
    });
    revalidatePath("/dashboard");
    revalidatePath("/catalogue");
    revalidatePath("/stock/receipts");
    revalidatePath("/stock/movements");
    revalidatePath("/stock/expiring");
    for (const line of request.items) revalidatePath(`/catalogue/${line.variant_id}`);
    return { status: "success", receipt };
  } catch (error) {
    if (error instanceof ApiError) {
      const errors = (error.body as { errors?: LineFailure[] } | null)?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return {
          status: "rejected",
          problems: errors.map((f) => ({ index: f.index, message: humaniseLine(f) })),
        };
      }
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

function humaniseLine(f: LineFailure): string {
  switch (f.reason) {
    case "not_found":
      return "This medicine no longer exists in the catalogue. Remove the line.";
    case "inactive":
      return "This medicine is withdrawn from sale. Put it back on sale first, then receive it.";
    case "unit_not_found":
      return "That unit isn't set up for this medicine any more. Pick another unit.";
    case "expired_batch":
      return "The expiry date is already in the past. Check the date on the pack.";
    default:
      return f.message;
  }
}

/** Item lookup for the receive form — includes unpriced SKUs, since stock can arrive before pricing. */
export async function searchForReceive(term: string) {
  const query = term.trim();
  if (query.length < 2) return [];
  const result = await listVariants({ search: query, status: "active", limit: 20 });
  return result.data.map((v) => ({
    id: v.id,
    name: `${v.product.brandName}${v.strength ? ` ${v.strength}` : ""}`,
    dosageForm: v.dosageForm,
    manufacturer: v.product.manufacturer?.name ?? "",
    baseUnit: v.baseUnit,
    stock: v.stockQuantity,
    units: (v.units ?? []).map((u) => ({ id: u.id, name: u.name, qtyInBase: u.qtyInBase })),
  }));
}

export type ReceiveSearchResult = Awaited<ReturnType<typeof searchForReceive>>[number];
