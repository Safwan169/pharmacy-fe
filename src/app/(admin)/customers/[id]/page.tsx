import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CustomerForm, ReceivePayment } from "@/components/customers/customer-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCustomer, getCustomerHistory } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { PaymentMethod } from "@/types";
import { getT } from "@/i18n/server";
import { PAYMENT_METHOD_KEYS, SALE_STATUS_KEYS } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  try {
    return { title: (await getCustomer(Number(id))).name };
  } catch {
    return { title: "Customer" };
  }
}

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const customerId = Number(id);
  const t = await getT();
  if (!Number.isInteger(customerId) || customerId < 1) notFound();

  let customer;
  let history;
  try {
    [customer, history] = await Promise.all([getCustomer(customerId), getCustomerHistory(customerId)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("customer.back")}
      </Link>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.address].filter(Boolean).join(" · ") || t("customer.noContact")}
        action={
          customer.dueBalance > 0 ? (
            <Badge tone="warning" className="text-sm">{t("customer.owesAmount", { amount: formatCurrency(customer.dueBalance) })}</Badge>
          ) : (
            <Badge tone="success">{t("customer.nothingOwed")}</Badge>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title={t("customer.salesTitle")} />
            {history.sales.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("customer.noSales")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("th.invoice")}</Th>
                    <Th>{t("th.when")}</Th>
                    <Th className="text-right">{t("th.total")}</Th>
                    <Th className="text-right">{t("customer.stillOwed")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.sales.map((s) => (
                    <tr key={s.id}>
                      <Td>
                        <Link href={`/sales/${s.id}`} className="font-mono text-sm text-primary hover:underline">{s.invoiceNumber}</Link>
                        <p className="text-xs text-muted">
                          {PAYMENT_METHOD_KEYS[s.paymentMethod as PaymentMethod] ? t(PAYMENT_METHOD_KEYS[s.paymentMethod as PaymentMethod]) : s.paymentMethod}
                          {s.status !== "completed" ? ` · ${t(SALE_STATUS_KEYS[s.status])}` : ""}
                        </p>
                      </Td>
                      <Td className="text-muted">{formatDateTime(s.createdAt)}</Td>
                      <Td className="text-right tabular-nums">{formatCurrency(s.totalAmount)}</Td>
                      <Td className="text-right tabular-nums">
                        {s.dueAmount > 0 ? <span className="text-warning">{formatCurrency(s.dueAmount)}</span> : <span className="text-muted">—</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title={t("customer.payments")} />
            {history.payments.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("customer.noPayments")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("deliveries.receipt")}</Th>
                    <Th>{t("th.when")}</Th>
                    <Th>{t("receipt.by")}</Th>
                    <Th className="text-right">{t("th.amount")}</Th>
                    <Th className="text-right">{t("customer.balanceAfter")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.payments.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <a href={`/api/payment-receipts/${p.id}`} target="_blank" rel="noopener" className="font-mono text-sm text-primary hover:underline">
                          {p.receiptNumber}
                        </a>
                      </Td>
                      <Td className="text-muted">{formatDateTime(p.createdAt)}</Td>
                      <Td>{p.method === "bkash" ? t("paymentMethod.bkash") : t("paymentMethod.cash")}{p.bkashTrxId ? ` · ${p.bkashTrxId}` : ""}</Td>
                      <Td className="text-right font-medium tabular-nums text-success">{formatCurrency(p.amount)}</Td>
                      <Td className="text-right tabular-nums text-muted">{formatCurrency(p.balanceAfter)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {customer.dueBalance > 0 && (
            <Card>
              <CardHeader title={t("due.receivePayment")} />
              <CardBody>
                <ReceivePayment customerId={customer.id} dueBalance={customer.dueBalance} />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t("catalogue.details")} />
            <CardBody>
              <CustomerForm customer={customer} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
