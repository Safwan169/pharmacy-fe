"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  supplierSchema,
  type SupplierFormValues,
  type SupplierInput,
} from "@/lib/validations";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SupplierForm({
  defaultValues,
}: {
  defaultValues?: Partial<SupplierFormValues>;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues, unknown, SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { isActive: true, ...defaultValues },
  });

  async function onSubmit(values: SupplierInput) {
    // TODO: replace with the real API call once the backend exists.
    console.log("supplier payload", values);
    router.push("/suppliers");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader title="Supplier details" description="Contact and licensing" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required error={errors.name?.message} htmlFor="name">
            <Input
              id="name"
              placeholder="MedSource Distributors"
              invalid={!!errors.name}
              {...register("name")}
            />
          </Field>

          <Field label="Contact person" error={errors.contactPerson?.message} htmlFor="contactPerson">
            <Input id="contactPerson" placeholder="Rina Patel" {...register("contactPerson")} />
          </Field>

          <Field label="Email" required error={errors.email?.message} htmlFor="email">
            <Input
              id="email"
              type="email"
              placeholder="orders@supplier.com"
              invalid={!!errors.email}
              {...register("email")}
            />
          </Field>

          <Field label="Phone" required error={errors.phone?.message} htmlFor="phone">
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 0142"
              invalid={!!errors.phone}
              {...register("phone")}
            />
          </Field>

          <Field label="License number" error={errors.licenseNumber?.message} htmlFor="licenseNumber">
            <Input id="licenseNumber" placeholder="DL-99231" {...register("licenseNumber")} />
          </Field>

          <Field label="Address" error={errors.address?.message} htmlFor="address">
            <Input id="address" placeholder="18 Harbour Road" {...register("address")} />
          </Field>

          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary"
              {...register("isActive")}
            />
            Active supplier
          </label>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save supplier"}
        </Button>
      </div>
    </form>
  );
}
