"use client";

import { useActionState, useState, useTransition } from "react";
import { Ban, CircleCheck, Undo2 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select } from "@/components/ui/input";
import { returnItems, voidSale, type ReturnResult, type VoidState } from "@/lib/actions/returns";
import { cn, formatCurrency } from "@/lib/utils";
import type { RefundMethod, Sale, SaleItem } from "@/types";
import { useT } from "@/i18n/client";
import { REFUND_METHOD_KEYS } from "@/i18n";

const voidInitial: VoidState = { status: "idle" };

/** The two ways to undo a sale, shown only when each is allowed. */
export function SaleActions({ sale, isToday, canVoid: roleAllowsVoid }: { sale: Sale; isToday: boolean; canVoid: boolean }) {
  const t = useT();
  const items = sale.items ?? [];
  const canVoid = roleAllowsVoid && sale.status === "completed" && isToday;
  const canReturn =
    (sale.status === "completed" || sale.status === "partial_return") &&
    items.some((i) => i.quantity - i.returnedQuantity > 0);

  if (!canVoid && !canReturn) return null;

  return (
    <Card>
      <CardHeader title={t("undo.title")} description={t("undo.hint")} />
      <CardBody className="space-y-5">
        {canVoid && <VoidPanel sale={sale} />}
        {canReturn && <ReturnPanel sale={sale} items={items} />}
      </CardBody>
    </Card>
  );
}

function VoidPanel({ sale }: { sale: Sale }) {
  const [state, formAction, pending] = useActionState(voidSale, voidInitial);
  const [confirming, setConfirming] = useState(false);
  const t = useT();

  if (state.status === "success") {
    return <Alert tone="success">{state.message}</Alert>;
  }

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
        <Ban className="h-4 w-4" aria-hidden />
        {t("undo.void")}
      </Button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <input type="hidden" name="sale_id" value={sale.id} />
      <p className="text-sm font-semibold text-danger">{t("undo.voidConfirm", { invoice: sale.invoiceNumber })}</p>
      <p className="mt-1 text-sm text-foreground/80">
        {t("undo.voidBody", { amount: formatCurrency(sale.totalAmount) })}
      </p>
      {state.status === "error" && state.message && (
        <div className="mt-3">
          <Alert tone="error">{state.message}</Alert>
        </div>
      )}
      <div className="mt-3">
        <Field label={t("undo.why")} htmlFor="void_reason" required>
          <Input id="void_reason" name="reason" maxLength={255} placeholder={t("undo.whyPlaceholder")} autoFocus />
        </Field>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? t("undo.voiding") : t("undo.yesVoid")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}

function ReturnPanel({ sale, items }: { sale: Sale; items: SaleItem[] }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<number, string>>({});
  const [restock, setRestock] = useState<Record<number, boolean>>({});
  const [method, setMethod] = useState<RefundMethod>(sale.paymentMethod === "bkash" ? "bkash" : "cash");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ReturnResult | null>(null);
  const [pending, start] = useTransition();
  const t = useT();

  const returnable = items.filter((i) => i.quantity - i.returnedQuantity > 0);
  const subtotal = sale.subtotal;

  const lines = returnable
    .map((item) => ({ item, quantity: Number(qty[item.id] ?? 0) }))
    .filter((l) => l.quantity > 0);

  const errors = returnable.map((item) => {
    const n = Number(qty[item.id] ?? 0);
    const max = item.quantity - item.returnedQuantity;
    if (qty[item.id] && (!Number.isInteger(n) || n < 0)) return t("undo.wholeNumbers");
    if (n > max) return t("undo.onlyLeft", { max });
    return undefined;
  });
  const hasErrors = errors.some(Boolean);

  // Mirrors the API: unit price less this line's share of the sale discount.
  const refundFor = (item: SaleItem, n: number) => {
    const share = subtotal === 0 ? 0 : (sale.discountAmount * item.lineTotal) / subtotal;
    return ((item.lineTotal - share) * n) / item.quantity;
  };
  const refundTotal = lines.reduce((sum, l) => sum + refundFor(l.item, l.quantity), 0);

  if (result?.status === "success") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CircleCheck className="h-4 w-4" aria-hidden />
          {t("undo.recorded")} — {result.returnNumber}
        </p>
        <p className="mt-1 text-sm">
          {t("undo.giveCustomer")} <span className="font-semibold tabular-nums">{formatCurrency(result.refundAmount)}</span>
          {method === "due_adjust" ? ` ${t("undo.offDue")}` : ` ${t("undo.inMethod", { method: t(REFUND_METHOD_KEYS[method]) })}`}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Undo2 className="h-4 w-4" aria-hidden />
        {t("undo.returnItems")}
      </Button>
    );
  }

  const problems = new Map(result?.status === "rejected" ? result.problems.map((p) => [p.saleItemId, p.message]) : []);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <p className="text-sm font-medium">{t("undo.whichItems")}</p>
      {result?.status === "error" && <Alert tone="error">{result.message}</Alert>}
      {result?.status === "rejected" && <Alert tone="error">{t("undo.fixLines")}</Alert>}

      <ul className="divide-y divide-border">
        {returnable.map((item, index) => {
          const max = item.quantity - item.returnedQuantity;
          const n = Number(qty[item.id] ?? 0);
          const err = problems.get(item.id) ?? errors[index];
          return (
            <li key={item.id} className={cn("py-3", err && "bg-danger/5")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.brandNameSnapshot}
                    {item.strengthSnapshot ? ` ${item.strengthSnapshot}` : ""}
                  </p>
                  <p className="text-xs text-muted">
                    {t("undo.soldLine", { qty: item.quantity, unit: item.unitNameSnapshot, price: formatCurrency(item.unitPrice) })}
                    {item.returnedQuantity > 0 ? ` · ${t("undo.alreadyReturned", { count: item.returnedQuantity })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Input
                    aria-label={t("undo.howManyReturn", { unit: item.unitNameSnapshot, name: item.brandNameSnapshot })}
                    inputMode="numeric"
                    placeholder="0"
                    value={qty[item.id] ?? ""}
                    onChange={(e) => {
                      setQty((q) => ({ ...q, [item.id]: e.target.value.replace(/\D/g, "") }));
                      setResult(null);
                    }}
                    className="w-16 text-center"
                  />
                  <span className="text-xs text-muted">/ {max}</span>
                </div>
              </div>
              {n > 0 && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={restock[item.id] ?? true}
                      onChange={(e) => setRestock((r) => ({ ...r, [item.id]: e.target.checked }))}
                    />
                    {t("undo.putBack")}
                    {!(restock[item.id] ?? true) && <span className="text-warning">{t("undo.damaged")}</span>}
                  </label>
                  <span className="tabular-nums text-muted">{t("undo.refund").toLowerCase()} {formatCurrency(refundFor(item, n))}</span>
                </div>
              )}
              {err && <p className="mt-1 text-xs text-danger">{err}</p>}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("undo.refundHow")} htmlFor="refund_method">
          <Select id="refund_method" value={method} onChange={(e) => setMethod(e.target.value as RefundMethod)}>
            <option value="cash">{t("refund.cash")}</option>
            <option value="bkash">{t("refund.bkash")}</option>
            <option value="due_adjust">{t("refund.due_adjust")}</option>
          </Select>
        </Field>
        <Field label={t("sale.reason")} htmlFor="return_reason" hint={`${t("common.optional")}.`}>
          <Input id="return_reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} />
        </Field>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm">
          {t("undo.refund")} <span className="font-semibold tabular-nums">{formatCurrency(refundTotal)}</span>
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            disabled={pending || hasErrors || lines.length === 0}
            onClick={() =>
              start(async () => {
                const r = await returnItems({
                  saleId: sale.id,
                  items: lines.map((l) => ({
                    sale_item_id: l.item.id,
                    quantity: l.quantity,
                    restock: restock[l.item.id] ?? true,
                  })),
                  refund_method: method,
                  reason: reason.trim() || undefined,
                });
                setResult(r);
              })
            }
          >
            {pending ? t("undo.recording") : t("undo.recordReturn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
