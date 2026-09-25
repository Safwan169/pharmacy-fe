"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CircleCheck, Download, Plus, Printer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import type { PaymentMethod, Sale } from "@/types";
import { useT } from "@/i18n/client";
import { PAYMENT_METHOD_KEYS } from "@/i18n";

/** Opens the thermal receipt in a small window and asks it to print. */
function printReceipt(saleId: number) {
  const win = window.open(`/api/receipts/${saleId}`, "receipt", "width=420,height=640");
  if (!win) return;
  win.addEventListener("load", () => {
    setTimeout(() => win.print(), 300);
  });
}

/**
 * Shown the moment a sale goes through. One number is read out loud at the
 * counter — the change, or what goes on account — so that is the only thing
 * set large; the rest is a quiet line or two, and the next customer is one
 * key away.
 */
export function SaleReceipt({
  sale,
  onNewSale,
}: {
  sale: Sale;
  onNewSale: () => void;
}) {
  const t = useT();
  const method = PAYMENT_METHOD_KEYS[sale.paymentMethod as PaymentMethod];
  const onAccount = sale.paymentMethod === "due";
  const change =
    sale.paymentMethod === "cash" && sale.amountTendered !== null ? (sale.changeGiven ?? 0) : null;

  const invoiceRef = useRef<HTMLAnchorElement>(null);

  // A finished sale sits on top of the counter rather than replacing it, and
  // answers to the keyboard: the next customer is usually already waiting, so
  // every button here has a letter.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        onNewSale();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "p") {
        event.preventDefault();
        void printReceipt(sale.id);
      }
      if (key === "a") {
        event.preventDefault();
        invoiceRef.current?.click();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNewSale, sale.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("receipt.complete")}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 pt-10 backdrop-blur-[1px]"
    >
      <Card className="w-full max-w-sm shadow-xl">
        <CardBody className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10">
              <CircleCheck className="h-5 w-5 text-success" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t("receipt.complete")}</span>
              <span className="block truncate font-mono text-xs text-muted">{sale.invoiceNumber}</span>
            </span>
          </div>

          {/* The one number that gets said out loud. */}
          <div
            className={cn(
              "rounded-xl border p-4 text-center",
              onAccount ? "border-warning/25 bg-warning/5" : "border-success/25 bg-success/5",
            )}
          >
            <p className="text-xs font-medium tracking-wide text-muted uppercase">
              {change !== null && change > 0
                ? t("receipt.change")
                : onAccount
                  ? t("receipt.onAccount")
                  : t("receipt.paid")}
            </p>
            <p className="text-3xl font-semibold tabular-nums">
              {formatCurrency(change !== null && change > 0 ? change : sale.totalAmount)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {change !== null && change > 0
                ? t("receipt.ofTotal", { amount: formatCurrency(sale.totalAmount) })
                : method
                  ? t(method)
                  : sale.paymentMethod}
            </p>
          </div>

          <dl className="space-y-1 text-sm">
            {sale.discountAmount > 0 && (
              <>
                <Row label={t("pos.subtotal")} value={formatCurrency(sale.subtotal)} />
                <Row
                  label={
                    t("pos.discount") +
                    (sale.discountType === "percentage" && sale.discountValue
                      ? ` (${sale.discountValue}%)`
                      : "")
                  }
                  value={`−${formatCurrency(sale.discountAmount)}`}
                  tone="success"
                />
              </>
            )}
            {change !== null && sale.amountTendered !== null && (
              <Row label={t("payment.cashGiven")} value={formatCurrency(sale.amountTendered)} />
            )}
            {onAccount && sale.customer && (
              <Row
                label={t("receipt.customer")}
                value={`${sale.customer.name} · ${t("receipt.owes", {
                  amount: formatCurrency(sale.customer.dueBalance),
                })}`}
              />
            )}
          </dl>

          <div className="space-y-2">
            <Button onClick={onNewSale} autoFocus className="h-12 w-full text-base">
              <Plus className="h-4 w-4" aria-hidden />
              {t("receipt.next")}
              <Hint>Enter</Hint>
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void printReceipt(sale.id)}
                className="h-10"
              >
                <Printer className="h-4 w-4" aria-hidden />
                {t("receipt.print")}
                <Hint>P</Hint>
              </Button>
              <a
                ref={invoiceRef}
                href={`/api/invoices/${sale.id}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-background"
              >
                <Download className="h-4 w-4" aria-hidden />
                {t("receipt.a4")}
                <Hint>A</Hint>
              </a>
            </div>
          </div>

          <Link
            href={`/sales/${sale.id}`}
            className="block text-center text-xs font-medium text-muted hover:text-primary hover:underline"
          >
            {t("receipt.viewSale")}
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className={cn("flex justify-between gap-3", tone === "success" && "text-success")}>
      <dt className={tone === undefined ? "text-muted" : undefined}>{label}</dt>
      <dd className="truncate text-right tabular-nums">{value}</dd>
    </div>
  );
}

/** The letter that fires a button, shown on the button itself. */
function Hint({ children }: { children: string }) {
  return (
    <kbd className="ml-1 hidden rounded border border-current/30 px-1 text-[10px] leading-4 font-normal opacity-70 sm:inline">
      {children}
    </kbd>
  );
}
