"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  medicineSchema,
  DOSAGE_FORMS,
  type MedicineFormValues,
  type MedicineInput,
} from "@/lib/validations";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Category, Supplier } from "@/types";

interface MedicineFormProps {
  categories: Category[];
  suppliers: Supplier[];
  defaultValues?: Partial<MedicineFormValues>;
}

export function MedicineForm({
  categories,
  suppliers,
  defaultValues,
}: MedicineFormProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MedicineFormValues, unknown, MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: {
      dosageForm: "tablet",
      prescriptionRequired: false,
      quantity: 0,
      reorderLevel: 10,
      ...defaultValues,
    },
  });

  async function onSubmit(values: MedicineInput) {
    // TODO: replace with the real API call once the backend exists.
    console.log("medicine payload", values);
    router.push("/medicines");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader title="Details" description="Identification and classification" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name?.message} htmlFor="name">
            <Input
              id="name"
              placeholder="Amoxicillin 500mg"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field label="Generic name" error={errors.genericName?.message} htmlFor="genericName">
            <Input id="genericName" placeholder="Amoxicillin" {...register("genericName")} />
          </Field>

          <Field label="Brand" error={errors.brand?.message} htmlFor="brand">
            <Input id="brand" placeholder="Amoxil" {...register("brand")} />
          </Field>

          <Field label="Category" required error={errors.categoryId?.message} htmlFor="categoryId">
            <Select id="categoryId" invalid={!!errors.categoryId} {...register("categoryId")}>
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Supplier" required error={errors.supplierId?.message} htmlFor="supplierId">
            <Select id="supplierId" invalid={!!errors.supplierId} {...register("supplierId")}>
              <option value="">Select a supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Dosage form" required error={errors.dosageForm?.message} htmlFor="dosageForm">
            <Select id="dosageForm" invalid={!!errors.dosageForm} {...register("dosageForm")}>
              {DOSAGE_FORMS.map((form) => (
                <option key={form} value={form}>
                  {form.charAt(0).toUpperCase() + form.slice(1)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Strength" error={errors.strength?.message} htmlFor="strength">
            <Input id="strength" placeholder="500mg" {...register("strength")} />
          </Field>

          <Field
            label="Barcode"
            error={errors.barcode?.message}
            hint="8-14 digits"
            htmlFor="barcode"
          >
            <Input
              id="barcode"
              inputMode="numeric"
              invalid={!!errors.barcode}
              {...register("barcode")}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Stock & pricing" description="Batch, quantity and prices" />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Batch number" required error={errors.batchNumber?.message} htmlFor="batchNumber">
            <Input
              id="batchNumber"
              placeholder="BT-2201"
              invalid={!!errors.batchNumber}
              {...register("batchNumber")}
            />
          </Field>

          <Field label="Cost price" required error={errors.costPrice?.message} htmlFor="costPrice">
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.costPrice}
              {...register("costPrice")}
            />
          </Field>

          <Field label="Selling price" required error={errors.sellingPrice?.message} htmlFor="sellingPrice">
            <Input
              id="sellingPrice"
              type="number"
              step="0.01"
              min="0"
              invalid={!!errors.sellingPrice}
              {...register("sellingPrice")}
            />
          </Field>

          <Field label="Quantity" required error={errors.quantity?.message} htmlFor="quantity">
            <Input
              id="quantity"
              type="number"
              min="0"
              invalid={!!errors.quantity}
              {...register("quantity")}
            />
          </Field>

          <Field
            label="Reorder level"
            required
            error={errors.reorderLevel?.message}
            hint="Alert when stock drops to this"
            htmlFor="reorderLevel"
          >
            <Input
              id="reorderLevel"
              type="number"
              min="0"
              invalid={!!errors.reorderLevel}
              {...register("reorderLevel")}
            />
          </Field>

          <Field label="Manufacture date" error={errors.manufactureDate?.message} htmlFor="manufactureDate">
            <Input id="manufactureDate" type="date" {...register("manufactureDate")} />
          </Field>

          <Field label="Expiry date" required error={errors.expiryDate?.message} htmlFor="expiryDate">
            <Input
              id="expiryDate"
              type="date"
              invalid={!!errors.expiryDate}
              {...register("expiryDate")}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Additional" />
        <CardBody className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              {...register("prescriptionRequired")}
            />
            Prescription required
          </label>

          <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
            <textarea
              id="notes"
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
              placeholder="Storage instructions, handling notes..."
              {...register("notes")}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save medicine"}
        </Button>
      </div>
    </form>
  );
}
