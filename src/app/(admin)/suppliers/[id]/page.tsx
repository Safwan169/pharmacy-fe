import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { SupplierForm } from "@/components/stock/supplier-form";
import { PaySupplier } from "@/components/stock/supplier-payment";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { getSupplier, getSupplierHistory } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getT } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/suppliers/[id]">) {
  const { id } = await params;
  try {
    return { title: (await getSupplier(Number(id))).name };
  } catch {
    return { title: "Supplier" };
  }
}

export default async function SupplierPage({ params }: PageProps<"/suppliers/[id]">) {
  await requireOwner();
  const { id } = await params;
  const supplierId = Number(id);
  const t = await getT();
  if (!Number.isInteger(supplierId) || supplierId < 1) notFound();

  let supplier;
  let history;
  try {
    [supplier, history] = await Promise.all([getSupplier(supplierId), getSupplierHistory(supplierId)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <>
      <Link href="/suppliers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("supplier.back")}
      </Link>
      <PageHeader
        title={supplier.name}
        description={[supplier.phone, supplier.address].filter(Boolean).join(" · ") || t("customer.noContact")}
        action={
          <span className="flex items-center gap-2">
            {supplier.dueBalance > 0 ? (
              <Badge tone="warning" className="text-sm">{t("supplier.weOweAmount", { amount: formatCurrency(supplier.dueBalance) })}</Badge>
            ) : (
              <Badge tone="success">{t("supplier.nothingOwed")}</Badge>
            )}
            <LinkButton href={`/stock/receive?supplier=${supplier.id}`} variant="secondary">{t("suppliers.receiveFrom")}</LinkButton>
          </span>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title={t("supplier.deliveries")} />
            {history.receipts.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("supplier.noDeliveries")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("deliveries.receipt")}</Th>
                    <Th>{t("th.date")}</Th>
                    <Th className="text-right">{t("th.total")}</Th>
                    <Th className="text-right">{t("supplier.stillOwed")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.receipts.map((r) => {
                    const due = r.totalCost - r.paidAmount;
                    return (
                      <tr key={r.id}>
                        <Td>
                          <Link href={`/stock/receipts/${r.id}`} className="font-mono text-sm text-primary hover:underline">{r.receiptNumber}</Link>
                          {r.supplierInvoiceNo && <p className="text-xs text-muted">{r.supplierInvoiceNo}</p>}
                        </Td>
                        <Td className="text-muted">{formatDate(r.receivedAt)}</Td>
                        <Td className="text-right tabular-nums">{formatCurrency(r.totalCost)}</Td>
                        <Td className="text-right tabular-nums">
                          {due > 0 ? <span className="text-warning">{formatCurrency(due)}</span> : <span className="text-muted">—</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title={t("supplier.payments")} />
            {history.payments.length === 0 ? (
              <p className="p-5 text-sm text-muted">{t("customer.noPayments")}</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>{t("supplierPay.number")}</Th>
                    <Th>{t("th.when")}</Th>
                    <Th>{t("receipt.by")}</Th>
                    <Th className="text-right">{t("th.amount")}</Th>
                    <Th className="text-right">{t("customer.balanceAfter")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {history.payments.map((p) => (
                    <tr key={p.id}>
                      <Td className="font-mono text-sm">{p.paymentNumber}</Td>
                      <Td className="text-muted">{formatDateTime(p.createdAt)}</Td>
                      <Td>
                        {p.method === "bkash" ? t("paymentMethod.bkash") : t("paymentMethod.cash")}
                        {p.reference ? ` · ${p.reference}` : ""}
                        {p.note ? <p className="text-xs text-muted">{p.note}</p> : null}
                      </Td>
                      <Td className="text-right font-medium tabular-nums text-danger">−{formatCurrency(p.amount)}</Td>
                      <Td className="text-right tabular-nums text-muted">{formatCurrency(p.balanceAfter)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {supplier.dueBalance > 0 && (
            <Card>
              <CardHeader title={t("supplierPay.button")} />
              <CardBody>
                <PaySupplier supplierId={supplier.id} dueBalance={supplier.dueBalance} />
              </CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title={t("catalogue.details")} />
            <CardBody>
              <SupplierForm supplier={supplier} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
