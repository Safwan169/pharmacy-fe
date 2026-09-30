"use client";

import { useActionState, useEffect, useState } from "react";
import { Banknote, X } from "lucide-react";
import { paySupplier, type SupplierPaymentState } from "@/lib/actions/stock";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/i18n/client";

const initial: SupplierPaymentState = { status: "idle" };

/** Money is two decimal places, and so is anything a button fills in for you. */
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * The payment itself.
 *
 * The amount has always been a free box — the API takes whatever is under
 * what's owed and leaves the rest on account — but it opened filled with the
 * whole balance, which reads as the only thing on offer. The two buttons and
 * the running "what would be left" say out loud that paying part of it is
 * normal, which is how a shop actually pays a distributor.
 */
function PayForm({
  supplierId,
  dueBalance,
  onDone,
}: {
  supplierId: number;
  dueBalance: number;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(paySupplier, initial);
  const [method, setMethod] = useState<"cash" | "bkash">("cash");
  const [amount, setAmount] = useState(dueBalance > 0 ? String(round2(dueBalance)) : "");
  const t = useT();

  const typed = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(typed) && typed > 0;
  const left = round2(dueBalance - typed);

  if (state.status === "success" && state.payment) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-sm">
        <p className="font-medium text-success">{state.message}</p>
        <p className="mt-1 text-xs text-muted">{state.payment.paymentNumber}</p>
        {onDone && (
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onDone}>
            {t("common.close")}
          </Button>
        )}
      </div>
    );
  }

  const quick: { key: "full" | "half"; label: string; value: number }[] = [
    { key: "full", label: t("supplierPay.full"), value: round2(dueBalance) },
    { key: "half", label: t("supplierPay.half"), value: round2(dueBalance / 2) },
  ];

  return (
    <form action={action} className="space-y-2 text-left" noValidate>
      <input type="hidden" name="supplier_id" value={supplierId} />
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <p className="text-xs text-muted">{t("supplierPay.youOwe", { amount: formatCurrency(dueBalance) })}</p>

      {dueBalance > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {quick.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setAmount(String(option.value))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                typed === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted hover:text-foreground",
              )}
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
          aria-label={t("th.amount")}
          className="tabular-nums"
        />
        <Select name="method" value={method} onChange={(e) => setMethod(e.target.value as "cash" | "bkash")} aria-label={t("sale.paidBy")}>
          <option value="cash">{t("paymentMethod.cash")}</option>
          <option value="bkash">{t("paymentMethod.bkash")}</option>
        </Select>
      </div>

      {/* Said before the request rather than after it: an amount over the
          balance is the one thing the API turns away. */}
      {valid && typed > dueBalance ? (
        <p className="text-xs text-warning">{t("supplierPay.overpayment")}</p>
      ) : valid && left > 0 ? (
        <p className="text-xs text-muted">{t("supplierPay.leftAfter", { amount: formatCurrency(left) })}</p>
      ) : valid ? (
        <p className="text-xs text-success">{t("supplierPay.clears")}</p>
      ) : (
        <p className="text-xs text-muted">{t("supplierPay.partHint")}</p>
      )}

      {method === "cash" && (
        <Select name="from_drawer" defaultValue="drawer" aria-label={t("cashFrom.label")}>
          <option value="drawer">{t("cashFrom.drawer")}</option>
          <option value="outside">{t("cashFrom.outside")}</option>
        </Select>
      )}
      {/* Cash has no transaction id, and a box asking for one under a
          payment marked "cash" only makes the form look unfinished. */}
      {method === "bkash" && (
        <Input name="reference" placeholder={`${t("supplierPay.reference")} (${t("common.optional").toLowerCase()})`} maxLength={50} aria-label={t("supplierPay.reference")} />
      )}
      <Input name="note" placeholder={`${t("deliveries.note")} (${t("common.optional").toLowerCase()})`} maxLength={255} aria-label={t("deliveries.note")} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("common.saving") : t("supplierPay.record")}</Button>
        {onDone && <Button type="button" size="sm" variant="ghost" onClick={onDone}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}

/**
 * "Pay supplier" — a button, and the form on a sheet of its own.
 *
 * It used to open in place: inside the payables row's last cell, which is
 * about a hundred pixels wide on a phone, and as a card partway down the
 * supplier's page, below the delivery history nobody scrolls to pay. One
 * dialog on every screen means the button can sit wherever it is wanted.
 */
export function PaySupplier({ supplierId, dueBalance }: { supplierId: number; dueBalance: number }) {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)} className="whitespace-nowrap">
        <Banknote className="h-3.5 w-3.5" aria-hidden /> {t("supplierPay.button")}
      </Button>
      {open && (
        <ModalShell label={t("supplierPay.button")} onDismiss={() => setOpen(false)}>
          <Card className="w-full max-w-md">
            <CardHeader
              title={t("supplierPay.button")}
              action={
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("common.close")}
                  className="-mt-1 -mr-1 rounded-lg p-1.5 text-muted hover:bg-background hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              }
            />
            <CardBody>
              <PayForm supplierId={supplierId} dueBalance={dueBalance} onDone={() => setOpen(false)} />
            </CardBody>
          </Card>
        </ModalShell>
      )}
    </>
  );
}
