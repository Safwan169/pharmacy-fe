"use client";

import Link from "next/link";
import { CircleCheck, Download, Plus } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Sale } from "@/types";

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
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardBody className="space-y-5 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheck className="h-6 w-6 text-success" aria-hidden />
          </span>

          <div>
            <h2 className="text-lg font-semibold">Sale complete</h2>
            <p className="mt-1 text-sm text-muted">
              Stock has been updated and the sale is recorded.
            </p>
          </div>

          <div className="rounded-xl bg-background p-4 text-left">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">
                Invoice
              </span>
              <span className="font-mono text-sm font-semibold">
                {sale.invoiceNumber}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs font-medium tracking-wide text-muted uppercase">
                Time
              </span>
              <span className="text-sm">{formatDateTime(sale.createdAt)}</span>
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-success">
                  <dt>
                    Discount
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
                <dt>Paid</dt>
                <dd className="tabular-nums">{formatCurrency(sale.totalAmount)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={`/api/invoices/${sale.id}`}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download invoice
            </a>
            <Button onClick={onNewSale} className="h-10 flex-1">
              <Plus className="h-4 w-4" aria-hidden />
              Next customer
            </Button>
          </div>

          <Link
            href={`/sales/${sale.id}`}
            className="inline-block text-xs font-medium text-primary hover:underline"
          >
            View the full sale
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
