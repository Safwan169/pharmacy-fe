"use client";

import { useActionState, useState } from "react";
import { Banknote } from "lucide-react";
import { paySupplier, type SupplierPaymentState } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/i18n/client";

const initial: SupplierPaymentState = { status: "idle" };

/** "Pay supplier" — inline on the payables list and on the supplier's page. */
export function PaySupplier({ supplierId, dueBalance, compact = false }: { supplierId: number; dueBalance: number; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [state, action, pending] = useActionState(paySupplier, initial);
  const [method, setMethod] = useState<"cash" | "bkash">("cash");
  const t = useT();

  if (state.status === "success" && state.payment) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
        <p className="font-medium text-success">{state.message}</p>
        <p className="mt-1 text-xs text-muted">{state.payment.paymentNumber}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Banknote className="h-3.5 w-3.5" aria-hidden /> {t("supplierPay.button")}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-lg border border-border bg-background p-3 text-left" noValidate>
      <input type="hidden" name="supplier_id" value={supplierId} />
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <p className="text-xs text-muted">{t("supplierPay.youOwe", { amount: formatCurrency(dueBalance) })}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input name="amount" inputMode="decimal" placeholder={t("th.amount")} defaultValue={dueBalance > 0 ? String(dueBalance) : ""} aria-label={t("th.amount")} className="tabular-nums" />
        <Select name="method" value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bkash")} aria-label={t("sale.paidBy")}>
          <option value="cash">{t("paymentMethod.cash")}</option>
          <option value="bkash">{t("paymentMethod.bkash")}</option>
        </Select>
      </div>
      {method === "cash" && (
        <Select name="from_drawer" defaultValue="drawer" aria-label={t("cashFrom.label")}>
          <option value="drawer">{t("cashFrom.drawer")}</option>
          <option value="outside">{t("cashFrom.outside")}</option>
        </Select>
      )}
      <Input name="reference" placeholder={`${t("supplierPay.reference")} (${t("common.optional").toLowerCase()})`} maxLength={50} aria-label={t("supplierPay.reference")} />
      <Input name="note" placeholder={`${t("deliveries.note")} (${t("common.optional").toLowerCase()})`} maxLength={255} aria-label={t("deliveries.note")} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("common.saving") : t("supplierPay.record")}</Button>
        {compact && <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}
