"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import { saveSupplier, type SupplierState } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import type { Supplier } from "@/types";
import { useT } from "@/i18n/client";

const initialState: SupplierState = { status: "idle" };

/** Add a supplier (no `supplier` prop) or edit one. */
export function SupplierForm({ supplier, onDone }: { supplier?: Supplier; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(saveSupplier, initialState);
  const t = useT();
  const saved = state.status === "success";

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {supplier && <input type="hidden" name="supplier_id" value={supplier.id} />}
      {saved && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      {/* Adding one supplier is usually adding three, so a saved form empties
          itself for the next one. Remounting the fields is what clears them —
          they are uncontrolled, and an action result does not touch them. */}
      <div key={saved && !supplier ? `saved-${state.message ?? ""}` : "typing"} className="grid gap-3 sm:grid-cols-3">
        <Field label={t("th.name")} htmlFor={`name-${supplier?.id ?? "new"}`} required>
          <Input id={`name-${supplier?.id ?? "new"}`} name="name" defaultValue={supplier?.name ?? ""} maxLength={150} />
        </Field>
        <Field label={t("th.phone")} htmlFor={`phone-${supplier?.id ?? "new"}`}>
          <Input id={`phone-${supplier?.id ?? "new"}`} name="phone" defaultValue={supplier?.phone ?? ""} maxLength={30} />
        </Field>
        <Field label={t("th.address")} htmlFor={`address-${supplier?.id ?? "new"}`}>
          <Input id={`address-${supplier?.id ?? "new"}`} name="address" defaultValue={supplier?.address ?? ""} maxLength={255} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("common.saving") : supplier ? t("common.save") : t("suppliers.addButton")}
        </Button>
        {supplier && (
          <Button type="submit" name="intent" value={supplier.isActive ? "deactivate" : "activate"} variant="secondary" disabled={pending}>
            {supplier.isActive ? t("suppliers.stopUsing") : t("suppliers.useAgain")}
          </Button>
        )}
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("common.close")}
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * The form on a sheet of its own.
 *
 * It used to sit in the page — the add form above the table, the edit form
 * inside the row's last cell. On a phone that cell is about a hundred pixels
 * wide, so three labelled boxes and three buttons stacked into a ribbon down
 * the side of the screen. A dialog has the whole width whatever the row is.
 */
function SupplierDialog({ supplier, onClose }: { supplier?: Supplier; onClose: () => void }) {
  const t = useT();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = supplier ? supplier.name : t("suppliers.add");

  return (
    <ModalShell label={title} onDismiss={onClose}>
      <Card className="w-full max-w-lg">
        <CardHeader
          title={title}
          description={supplier ? undefined : t("suppliers.addHint")}
          action={
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.close")}
              className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          }
        />
        <CardBody>
          <SupplierForm supplier={supplier} onDone={onClose} />
        </CardBody>
      </Card>
    </ModalShell>
  );
}

/** The page's own "add a supplier" button. */
export function AddSupplierButton() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("suppliers.addButton")}
      </Button>
      {open && <SupplierDialog onClose={() => setOpen(false)} />}
    </>
  );
}

/** A table row's edit toggle. */
export function SupplierEditToggle({ supplier }: { supplier: Supplier }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        {t("common.edit")}
      </button>
      {open && <SupplierDialog supplier={supplier} onClose={() => setOpen(false)} />}
    </>
  );
}
