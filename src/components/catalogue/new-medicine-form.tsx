"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addMedicine, type NewMedicineState } from "@/lib/actions/catalogue";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import type { Generic, Manufacturer } from "@/types";

const initial: NewMedicineState = { status: "idle" };

/** Forms the shop is most likely to type; the base unit follows from this. */
const DOSAGE_FORMS = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Suspension",
  "Injection",
  "Drops",
  "Cream",
  "Ointment",
  "Gel",
  "Sachet",
  "Inhaler",
  "Powder",
];

export function NewMedicineForm({
  manufacturers,
  generics,
  initialName = "",
}: {
  manufacturers: Manufacturer[];
  generics: Generic[];
  initialName?: string;
}) {
  const [state, action, pending] = useActionState(addMedicine, initial);
  const t = useT();

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <Alert tone="error">
          {state.message}
          {state.existingId && (
            <>
              {" "}
              <Link href={`/catalogue/${state.existingId}`} className="font-medium underline">
                {t("newMedicine.openExisting")}
              </Link>
            </>
          )}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("catalogue.brand")} htmlFor="brand_name" required hint={t("newMedicine.brandHint")}>
          <Input id="brand_name" name="brand_name" maxLength={255} autoFocus autoComplete="off" defaultValue={initialName} />
        </Field>
        <Field label={t("catalogue.strength")} htmlFor="strength" hint={t("newMedicine.strengthHint")}>
          <Input id="strength" name="strength" maxLength={100} autoComplete="off" />
        </Field>
        <Field label={t("th.company")} htmlFor="manufacturer_name" required hint={t("newMedicine.companyHint")}>
          <Input id="manufacturer_name" name="manufacturer_name" list="manufacturer-options" maxLength={255} autoComplete="off" />
          <datalist id="manufacturer-options">
            {manufacturers.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </Field>
        <Field label={t("catalogue.activeIngredient")} htmlFor="generic_name" hint={t("newMedicine.ingredientHint")}>
          <Input id="generic_name" name="generic_name" list="generic-options" maxLength={255} autoComplete="off" />
          <datalist id="generic-options">
            {generics.map((g) => (
              <option key={g.id} value={g.name} />
            ))}
          </datalist>
        </Field>
        <Field label={t("catalogue.form")} htmlFor="dosage_form" required hint={t("newMedicine.formHint")}>
          <Input id="dosage_form" name="dosage_form" list="form-options" maxLength={100} autoComplete="off" />
          <datalist id="form-options">
            {DOSAGE_FORMS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </Field>
        <Field label={t("newMedicine.packSize")} htmlFor="pack_size" hint={t("newMedicine.packSizeHint")}>
          <Input id="pack_size" name="pack_size" inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label={t("filters.kind")} htmlFor="type">
          <Select id="type" name="type" defaultValue="allopathic">
            <option value="allopathic">{t("kind.allopathic")}</option>
            <option value="herbal">{t("kind.herbal")}</option>
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : t("newMedicine.submit")}
        </Button>
        <Link href="/catalogue" className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-foreground">
          {t("common.cancel")}
        </Link>
      </div>
      <p className="text-xs text-muted">{t("newMedicine.next")}</p>
    </form>
  );
}
