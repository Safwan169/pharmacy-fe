"use client";

import Link from "next/link";
import { CircleCheck, Download, Plus, Printer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
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
 * Shown the moment a sale goes through. Leads with the invoice number and the
 * amount taken — the two things the person at the counter needs to read out —
 * and puts "next customer" within one click.
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
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardBody className="space-y-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheck className="h-6 w-6 text-success" aria-hidden />
          </span>

          <div>
            <h2 className="text-lg font-semibold">{t("receipt.complete")}</h2>
            <p className="mt-1 text-sm text-muted">
              {t("receipt.completeHint")}
            </p>
          </div>

          <div className="rounded-xl bg-background p-4 text-left">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">
                {t("th.invoice")}
              </span>
              <span className="font-mono text-sm font-semibold">
                {sale.invoiceNumber}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">
                {t("receipt.time")}
              </span>
              <span className="text-sm">{formatDateTime(sale.createdAt)}</span>
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{t("pos.subtotal")}</dt>
                <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>
                    {t("pos.discount")}
                    {sale.discountType === "percentage" && sale.discountValue
                      ? ` (${sale.discountValue}%)`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatCurrency(sale.discountAmount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold">
                <dt>{sale.paymentMethod === "due" ? t("receipt.onAccount") : t("receipt.paid")}</dt>
                <dd className="tabular-nums">{formatCurrency(sale.totalAmount)}</dd>
              </div>
              <div className="flex justify-between pt-1">
                <dt className="text-muted">{t("receipt.by")}</dt>
                <dd>{method ? t(method) : sale.paymentMethod}</dd>
              </div>
              {sale.paymentMethod === "cash" && sale.amountTendered !== null && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted">{t("payment.cashGiven")}</dt>
                    <dd className="tabular-nums">{formatCurrency(sale.amountTendered)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-success">
                    <dt>{t("receipt.change")}</dt>
                    <dd className="tabular-nums">{formatCurrency(sale.changeGiven ?? 0)}</dd>
                  </div>
                </>
              )}
              {sale.paymentMethod === "due" && sale.customer && (
                <div className="flex justify-between">
                  <dt className="text-muted">{t("receipt.customer")}</dt>
                  <dd>
                    {sale.customer.name}
                    <span className="ml-1 text-xs text-warning">{t("receipt.owes", { amount: formatCurrency(sale.customer.dueBalance) })}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => printReceipt(sale.id)} className="h-10 flex-1">
              <Printer className="h-4 w-4" aria-hidden />
              {t("receipt.print")}
            </Button>
            <a
              href={`/api/invoices/${sale.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("receipt.a4")}
            </a>
            <Button onClick={onNewSale} className="h-10 flex-1">
              <Plus className="h-4 w-4" aria-hidden />
              {t("receipt.next")}
            </Button>
          </div>

          <Link
            href={`/sales/${sale.id}`}
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            {t("receipt.viewSale")}
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
