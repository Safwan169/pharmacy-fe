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
import { getCurrentUser } from "@/lib/current-user";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime, todayInDhaka } from "@/lib/utils";
import type { PaymentMethod } from "@/types";
import { getT } from "@/i18n/server";
import { PAYMENT_METHOD_KEYS, REFUND_METHOD_KEYS, SALE_STATUS_KEYS } from "@/i18n";

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
  const t = await getT();

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
  const isOwner = (await getCurrentUser()).role === "owner";

  return (
    <>
      <Link
        href="/sales"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("sale.back")}
      </Link>

      <PageHeader
        title={sale.invoiceNumber}
        description={t("sale.soldOn", { date: formatDateTime(sale.createdAt) })}
        action={
          <span className="flex gap-2">
            <a
              href={`/api/receipts/${sale.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
            >
              {t("sale.receipt")}
            </a>
            <a
              href={`/api/invoices/${sale.id}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("receipt.a4")}
            </a>
          </span>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={STATUS_TONE[sale.status]}>{t(SALE_STATUS_KEYS[sale.status])}</Badge>
      </div>

      {sale.status === "voided" && (
        <Alert tone="warning" title={t("sale.voidedTitle")} className="mb-5">
          {sale.voidReason ? `${t("sale.reason")}: ${sale.voidReason}. ` : ""}
          {sale.voidedAt ? `${t("sale.voidedAt", { date: formatDateTime(sale.voidedAt) })}` : ""}
          {sale.voidedBy ? ` ${t("sale.by", { who: sale.voidedBy.email })}` : ""}. {t("sale.voidedBody")}
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("sale.whatSold")}
            description={t("sale.whatSoldHint")}
          />
          <Table>
            <thead>
              <tr>
                <Th>{t("th.medicine")}</Th>
                <Th className="text-right">{t("th.priceEach")}</Th>
                <Th className="text-right">{t("th.quantity")}</Th>
                <Th className="text-right">{t("th.lineTotal")}</Th>
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
                      <p className="text-xs text-warning">{t("sale.returnedCount", { count: item.returnedQuantity })}</p>
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
          <CardHeader title={t("sale.payment")} />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{t("pos.subtotal")}</dt>
                <dd className="tabular-nums">{formatCurrency(sale.subtotal)}</dd>
              </div>

              {sale.discountAmount > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>
                    {t("pos.discount")}
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
                  <dt className="text-muted">{t("pos.discount")}</dt>
                  <dd className="text-muted">{t("sale.noneGiven")}</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>{t("sale.totalPaid")}</dt>
                <dd className="tabular-nums">{formatCurrency(sale.totalAmount)}</dd>
              </div>

              {refunded > 0 && (
                <div className="flex justify-between text-warning">
                  <dt>{t("sale.refundedSince")}</dt>
                  <dd className="tabular-nums">−{formatCurrency(refunded)}</dd>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <dt className="text-muted">{t("sale.paidBy")}</dt>
                <dd>{PAYMENT_METHOD_KEYS[sale.paymentMethod as PaymentMethod] ? t(PAYMENT_METHOD_KEYS[sale.paymentMethod as PaymentMethod]) : sale.paymentMethod}</dd>
              </div>
              {sale.paymentMethod === "cash" && sale.amountTendered !== null && (
                <div className="flex justify-between">
                  <dt className="text-muted">{t("sale.cashChange")}</dt>
                  <dd className="tabular-nums">
                    {formatCurrency(sale.amountTendered)} / {formatCurrency(sale.changeGiven ?? 0)}
                  </dd>
                </div>
              )}
              {sale.bkashTrxId && (
                <div className="flex justify-between">
                  <dt className="text-muted">bKash TrxID</dt>
                  <dd className="font-mono">{sale.bkashTrxId}</dd>
                </div>
              )}
              {sale.customer && (
                <div className="flex justify-between">
                  <dt className="text-muted">{t("receipt.customer")}</dt>
                  <dd>
                    <Link href={`/customers/${sale.customer.id}`} className="text-primary hover:underline">
                      {sale.customer.name}
                    </Link>
                  </dd>
                </div>
              )}
              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-warning">
                  <dt>{t("sale.stillOwed")}</dt>
                  <dd className="tabular-nums">{formatCurrency(sale.dueAmount)}</dd>
                </div>
              )}

              {sale.createdBy && (
                <div className="flex justify-between">
                  <dt className="text-muted">{t("sale.servedBy")}</dt>
                  <dd className="truncate">{sale.createdBy.name || sale.createdBy.email}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SaleActions sale={sale} isToday={isToday} canVoid={isOwner} />
        </div>
        {returns.length > 0 && (
          <Card className="h-fit">
            <CardHeader title={t("sale.returns")} />
            <ul className="divide-y divide-border">
              {returns.map((r) => (
                <li key={r.id} className="px-5 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-mono font-medium">{r.returnNumber}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(r.refundAmount)}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {formatDateTime(r.createdAt)} · {t(REFUND_METHOD_KEYS[r.refundMethod])}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                  {(r.items ?? []).length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {(r.items ?? [])
                        .map((ri) => `${ri.quantity}× ${ri.saleItem?.brandNameSnapshot ?? t("sale.item")}${ri.restock ? "" : ` (${t("sale.notRestocked")})`}`)
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
