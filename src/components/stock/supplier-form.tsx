"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { saveSupplier, type SupplierState } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import type { Supplier } from "@/types";

const initialState: SupplierState = { status: "idle" };

/** Add a supplier (no `supplier` prop) or edit one inline. */
export function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(saveSupplier, initialState);

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {supplier && <input type="hidden" name="supplier_id" value={supplier.id} />}
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name" htmlFor={`name-${supplier?.id ?? "new"}`} required>
          <Input id={`name-${supplier?.id ?? "new"}`} name="name" defaultValue={supplier?.name ?? ""} maxLength={150} />
        </Field>
        <Field label="Phone" htmlFor={`phone-${supplier?.id ?? "new"}`}>
          <Input id={`phone-${supplier?.id ?? "new"}`} name="phone" defaultValue={supplier?.phone ?? ""} maxLength={30} />
        </Field>
        <Field label="Address" htmlFor={`address-${supplier?.id ?? "new"}`}>
          <Input id={`address-${supplier?.id ?? "new"}`} name="address" defaultValue={supplier?.address ?? ""} maxLength={255} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : supplier ? "Save" : "Add supplier"}
        </Button>
        {supplier && (
          <Button type="submit" name="intent" value={supplier.isActive ? "deactivate" : "activate"} variant="secondary" disabled={pending}>
            {supplier.isActive ? "Stop using" : "Use again"}
          </Button>
        )}
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Close
          </Button>
        )}
      </div>
    </form>
  );
}

/** A table row's edit toggle. */
export function SupplierEditToggle({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Edit
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-border bg-background p-3 text-left">
      <SupplierForm supplier={supplier} onDone={() => setOpen(false)} />
    </div>
  );
}
