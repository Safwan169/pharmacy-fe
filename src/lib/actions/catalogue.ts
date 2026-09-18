"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { createVariant } from "@/lib/api/catalogue";
import { getT } from "@/i18n/server";

export interface NewMedicineState {
  status: "idle" | "error";
  message?: string;
  /** Set when the same medicine already exists, so the form can link to it. */
  existingId?: number;
}

/** Adds a medicine by hand, then opens it so the units and price can be set. */
export async function addMedicine(_prev: NewMedicineState, formData: FormData): Promise<NewMedicineState> {
  const t = await getT();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const brand = text("brand_name");
  const manufacturer = text("manufacturer_name");
  const form = text("dosage_form");
  const type = text("type") === "herbal" ? "herbal" : "allopathic";
  const packRaw = text("pack_size");

  if (!brand) return { status: "error", message: t("newMedicine.errBrand") };
  if (!manufacturer) return { status: "error", message: t("newMedicine.errCompany") };
  if (!form) return { status: "error", message: t("newMedicine.errForm") };
  if (packRaw && !/^\d{1,6}$/.test(packRaw)) return { status: "error", message: t("newMedicine.errPack") };

  let id: number;
  try {
    const variant = await createVariant({
      brand_name: brand,
      manufacturer_name: manufacturer,
      generic_name: text("generic_name") || undefined,
      type,
      dosage_form: form,
      strength: text("strength") || undefined,
      pack_size: packRaw ? Number(packRaw) : undefined,
    });
    id = variant.id;
  } catch (error) {
    if (error instanceof ApiError) {
      const body = error.body as { reason?: string; variant_id?: number } | null;
      if (body?.reason === "variant_exists") {
        return { status: "error", message: t("newMedicine.exists"), existingId: body.variant_id };
      }
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/catalogue");
  redirect(`/catalogue/${id}?created=1`);
}
