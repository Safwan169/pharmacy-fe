"use client";

import { useActionState, useState } from "react";
import { Banknote, Pencil, Printer } from "lucide-react";
import { receiveDuePayment, saveCustomer, type CustomerFormState, type PaymentState } from "@/lib/actions/customers";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types";
import { useT } from "@/i18n/client";

const formInitial: CustomerFormState = { status: "idle" };
const paymentInitial: PaymentState = { status: "idle" };

export function CustomerForm({ customer, onDone }: { customer?: Customer; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveCustomer, formInitial);
  const k = customer?.id ?? "new";
  const t = useT();
  return (
    <form action={action} className="space-y-3" noValidate>
      {customer && <input type="hidden" name="customer_id" value={customer.id} />}
      {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <div className="grid gap-3 sm:grid-cols-3">
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

export function CustomerEditToggle({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const t = useT();
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden /> {t("common.edit")}
      </button>
    );
  }
  return (
    <div className="mt-2 rounded-lg border border-border bg-background p-3 text-left">
      <CustomerForm customer={customer} onDone={() => setOpen(false)} />
    </div>
  );
}

/** "Receive payment" — inline on the due list and the customer page. */
export function ReceivePayment({ customerId, dueBalance, compact = false }: { customerId: number; dueBalance: number; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [state, action, pending] = useActionState(receiveDuePayment, paymentInitial);
  const [method, setMethod] = useState<"cash" | "bkash">("cash");
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
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Banknote className="h-3.5 w-3.5" aria-hidden /> {t("due.receivePayment")}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-lg border border-border bg-background p-3 text-left" noValidate>
      <input type="hidden" name="customer_id" value={customerId} />
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <p className="text-xs text-muted">{t("due.theyOwe", { amount: formatCurrency(dueBalance) })}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" inputMode="decimal" placeholder={t("th.amount")} defaultValue={dueBalance > 0 ? String(dueBalance) : ""} aria-label={t("due.amountReceived")} className="tabular-nums" />
        <Select name="method" value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bkash")} aria-label={t("sale.paidBy")}>
          <option value="cash">{t("paymentMethod.cash")}</option>
          <option value="bkash">{t("paymentMethod.bkash")}</option>
        </Select>
      </div>
      {method === "bkash" && <Input name="bkash_trx_id" placeholder={`bKash TrxID (${t("common.optional").toLowerCase()})`} maxLength={30} className="font-mono uppercase" aria-label="bKash TrxID" />}
      <Input name="note" placeholder={`${t("deliveries.note")} (${t("common.optional").toLowerCase()})`} maxLength={255} aria-label={t("deliveries.note")} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("common.saving") : t("due.recordPayment")}</Button>
        {compact && <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}
