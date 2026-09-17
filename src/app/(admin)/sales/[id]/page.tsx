import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SaleActions } from "@/components/sales/sale-actions";
import { getSale } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime, todayInDhaka } from "@/lib/utils";
import { REFUND_METHOD_LABELS, SALE_STATUS_LABELS } from "@/types";

const STATUS_TONE = {
  completed: "success",
  voided: "danger",
  returned: "warning",
  partial_return: "warning",
} as const;

/** `YYYY-MM-DD` in Dhaka for an ISO timestamp, to decide whether a void is still allowed. */
function dhakaDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export async function generateMetadata({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  try {
    const sale = await getSale(Number(id));
    return { title: sale.invoiceNumber };
  } catch {
    return { title: "Sale" };
  }
}

export default async function SaleDetailPage({ params }: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const saleId = Number(id);

  if (!Number.isInteger(saleId) || saleId < 1) notFound();

  let sale;
  try {
    sale = await getSale(saleId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const items = sale.items ?? [];
  const returns = sale.returns ?? [];
  const refunded = returns.reduce((sum, r) => sum + r.refundAmount, 0);
  const isToday = dhakaDate(sale.createdAt) === todayInDhaka();

  return (
    <>
      <Link
        href="/sales"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sales
      </Link>

      <PageHeader
        title={sale.invoiceNumber}
        description={`Sold on ${formatDateTime(sale.createdAt)}`}
        action={
          <a
            href={`/api/invoices/${sale.id}`}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download invoice
          </a>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={STATUS_TONE[sale.status]}>{SALE_STATUS_LABELS[sale.status]}</Badge>
      </div>

      {sale.status === "voided" && (
        <Alert tone="warning" title="This sale was voided" className="mb-5">
          {sale.voidReason ? `Reason: ${sale.voidReason}. ` : ""}
          {sale.voidedAt ? `Voided ${formatDateTime(sale.voidedAt)}` : ""}
          {sale.voidedBy ? ` by ${sale.voidedBy.email}` : ""}. Stock went back on the shelf and nothing from it counts
          towards earnings.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="What was sold"
            description="Exactly as it was at the time of sale — later price changes don't affect this record."
          />
          <Table>
            <thead>
              <tr>
                <Th>Medicine</Th>
                <Th className="text-right">Price each</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Line total</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <p className="font-medium">
                      {item.brandNameSnapshot}
                      {item.strengthSnapshot ? ` ${item.strengthSnapshot}` : ""}
                    </p>
                    <p className="text-xs text-muted">{item.dosageFormSnapshot}</p>
                  </Td>
                  <Td className="text-right tabular-nums text-muted">
                    {formatCurrency(item.unitPrice)}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {item.quantity}
                    <span className="ml-1 text-xs text-muted">{item.unitNameSnapshot}</span>
                    {item.returnedQuantity > 0 && (
                      <p className="text-xs text-warning">{item.returnedQuantity} returned</p>
                    )}
                  </Td>
                  <Td className="text-right font-medium tabular-nums">
                    {formatCurrency(item.lineTotal)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Payment" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
              </div>

              {sale.discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>
                    Discount
                    {sale.discountType === "percentage" && sale.discountValue !== null
                      ? ` (${sale.discountValue}%)`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatCurrency(sale.discountAmount)}
                  </dd>
                </div>
              ) : (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd className="text-muted">None given</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total paid</dt>
                <dd className="tabular-nums">{formatCurrency(sale.totalAmount)}</dd>
              </div>

              {refunded > 0 && (
                <div className="flex justify-between text-warning">
                  <dt>Refunded since</dt>
                  <dd className="tabular-nums">−{formatCurrency(refunded)}</dd>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <dt className="text-muted">Paid by</dt>
                <dd className="capitalize">{sale.paymentMethod}</dd>
              </div>

              {sale.createdBy && (
                <div className="flex justify-between">
                  <dt className="text-muted">Served by</dt>
                  <dd className="truncate">{sale.createdBy.email}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SaleActions sale={sale} isToday={isToday} />
        </div>
        {returns.length > 0 && (
          <Card className="h-fit">
            <CardHeader title="Returns" />
            <ul className="divide-y divide-border">
              {returns.map((r) => (
                <li key={r.id} className="px-5 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono font-medium">{r.returnNumber}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(r.refundAmount)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {formatDateTime(r.createdAt)} · {REFUND_METHOD_LABELS[r.refundMethod]}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                  {(r.items ?? []).length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {(r.items ?? [])
                        .map((ri) => `${ri.quantity}× ${ri.saleItem?.brandNameSnapshot ?? "item"}${ri.restock ? "" : " (not restocked)"}`)
                        .join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
