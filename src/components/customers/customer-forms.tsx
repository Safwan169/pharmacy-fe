"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Banknote, Pencil, Plus, Printer, X } from "lucide-react";
import { receiveDuePayment, saveCustomer, type CustomerFormState, type PaymentState } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";
import { useT } from "@/i18n/client";

const formInitial: CustomerFormState = { status: "idle" };
const paymentInitial: PaymentState = { status: "idle" };

/** Escape closes whichever of these is open. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/**
 * A form on a sheet of its own.
 *
 * Adding a customer was a card above the table that every visit to the page
 * had to scroll past; editing one, and taking money off a debt, opened inside
 * the row's last cell — about a hundred pixels wide on a phone, which stacked
 * the boxes into a ribbon down the side of the table.
 */
function CustomerDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  useEscape(onClose);

  return (
    <ModalShell label={title} onDismiss={onClose}>
      <Card className="w-full max-w-lg">
        <CardHeader
          title={title}
          description={description}
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
        <CardBody>{children}</CardBody>
      </Card>
    </ModalShell>
  );
}

export function CustomerForm({ customer, onDone }: { customer?: Customer; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveCustomer, formInitial);
  const k = customer?.id ?? "new";
  const t = useT();
  const saved = state.status === "success";

  return (
    <form action={action} className="space-y-3" noValidate>
      {customer && <input type="hidden" name="customer_id" value={customer.id} />}
      {saved && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      {/* A saved form empties itself for the next one. Remounting the fields
          is what clears them — they are uncontrolled, so an action result
          does not touch them. */}
      <div key={saved && !customer ? `saved-${state.message ?? ""}` : "typing"} className="grid gap-3 sm:grid-cols-3">
        <Field label={t("th.name")} htmlFor={`name-${k}`} required>
          <Input id={`name-${k}`} name="name" defaultValue={customer?.name ?? ""} maxLength={100} />
        </Field>
        <Field label={t("th.phone")} htmlFor={`phone-${k}`} hint={t("customers.phoneHint")}>
          <Input id={`phone-${k}`} name="phone" inputMode="tel" defaultValue={customer?.phone ?? ""} maxLength={20} />
        </Field>
        <Field label={t("th.address")} htmlFor={`address-${k}`}>
          <Input id={`address-${k}`} name="address" defaultValue={customer?.address ?? ""} maxLength={255} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? t("common.saving") : customer ? t("common.save") : t("customers.addButton")}</Button>
        {onDone && <Button type="button" variant="ghost" onClick={onDone}>{t("common.close")}</Button>}
      </div>
    </form>
  );
}

/** The page's own "add a customer" button. */
export function AddCustomerButton() {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {t("customers.addButton")}
      </Button>
      {open && (
        <CustomerDialog title={t("customers.add")} onClose={() => setOpen(false)}>
          <CustomerForm onDone={() => setOpen(false)} />
        </CustomerDialog>
      )}
    </>
  );
}

/** A table row's edit toggle. */
export function CustomerEditToggle({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden /> {t("common.edit")}
      </button>
      {open && (
        <CustomerDialog title={customer.name} onClose={() => setOpen(false)}>
          <CustomerForm customer={customer} onDone={() => setOpen(false)} />
        </CustomerDialog>
      )}
    </>
  );
}

/** Taking money off what a customer owes. */
function PaymentForm({ customerId, dueBalance, onDone }: { customerId: number; dueBalance: number; onDone: () => void }) {
  const [state, action, pending] = useActionState(receiveDuePayment, paymentInitial);
  const [method, setMethod] = useState<"cash" | "bkash">("cash");
  const [amount, setAmount] = useState(dueBalance > 0 ? String(Math.round(dueBalance * 100) / 100) : "");
  const t = useT();

  if (state.status === "success" && state.payment) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
        <p className="font-medium text-success">{state.message}</p>
        <p className="mt-1 text-xs text-muted">{t("deliveries.receipt")} {state.payment.receiptNumber}</p>
        <a
          href={`/api/payment-receipts/${state.payment.id}`}
          target="_blank"
          rel="noopener"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden /> {t("receipt.print")}
        </a>
        <Button type="button" size="sm" variant="secondary" className="mt-3 block" onClick={onDone}>
          {t("common.close")}
        </Button>
      </div>
    );
  }

  const typed = Number(amount);
  const entered = amount.trim() !== "" && Number.isFinite(typed) && typed > 0;
  const left = Math.round((dueBalance - typed) * 100) / 100;

  return (
    <form action={action} className="space-y-2" noValidate>
      <input type="hidden" name="customer_id" value={customerId} />
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <p className="text-xs text-muted">{t("due.theyOwe", { amount: formatCurrency(dueBalance) })}</p>

      {/* Half of a debt is the usual instalment, and a box that opens with
          the whole balance in it reads as the only thing on offer. */}
      {dueBalance > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: "full", label: t("supplierPay.full"), value: Math.round(dueBalance * 100) / 100 },
            { key: "half", label: t("supplierPay.half"), value: Math.round((dueBalance / 2) * 100) / 100 },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setAmount(String(option.value))}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground"
            >
              {option.label} · {formatCurrency(option.value)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          name="amount"
          inputMode="decimal"
          placeholder={t("th.amount")}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label={t("due.amountReceived")}
          className="tabular-nums"
        />
        <Select name="method" value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bkash")} aria-label={t("sale.paidBy")}>
          <option value="cash">{t("paymentMethod.cash")}</option>
          <option value="bkash">{t("paymentMethod.bkash")}</option>
        </Select>
      </div>

      {entered && typed > dueBalance ? (
        <p className="text-xs text-warning">{t("due.moreThanOwed")}</p>
      ) : entered && left > 0 ? (
        <p className="text-xs text-muted">{t("supplierPay.leftAfter", { amount: formatCurrency(left) })}</p>
      ) : entered ? (
        <p className="text-xs text-success">{t("due.clears")}</p>
      ) : null}

      {method === "bkash" && <Input name="bkash_trx_id" placeholder={`bKash TrxID (${t("common.optional").toLowerCase()})`} maxLength={30} className="font-mono uppercase" aria-label="bKash TrxID" />}
      <Input name="note" placeholder={`${t("deliveries.note")} (${t("common.optional").toLowerCase()})`} maxLength={255} aria-label={t("deliveries.note")} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("common.saving") : t("due.recordPayment")}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

/** "Receive payment" — a button, and the form on a sheet of its own. */
export function ReceivePayment({ customerId, dueBalance }: { customerId: number; dueBalance: number }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)} className="whitespace-nowrap">
        <Banknote className="h-3.5 w-3.5" aria-hidden /> {t("due.receivePayment")}
      </Button>
      {open && (
        <CustomerDialog title={t("due.receivePayment")} onClose={() => setOpen(false)}>
          <PaymentForm customerId={customerId} dueBalance={dueBalance} onDone={() => setOpen(false)} />
        </CustomerDialog>
      )}
    </>
  );
}
