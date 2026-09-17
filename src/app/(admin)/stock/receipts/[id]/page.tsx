import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { getReceipt } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { getT } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/stock/receipts/[id]">) {
  const { id } = await params;
  return { title: `Delivery #${id}` };
}

export default async function ReceiptDetailPage({ params }: PageProps<"/stock/receipts/[id]">) {
  const { id } = await params;
  const receiptId = Number(id);
  const t = await getT();
  if (!Number.isInteger(receiptId) || receiptId < 1) notFound();

  let receipt;
  try {
    receipt = await getReceipt(receiptId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const items = receipt.items ?? [];

  return (
    <>
      <Link href="/stock/receipts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("deliveries.back")}
      </Link>

      <PageHeader
        title={receipt.receiptNumber}
        description={`${t("deliveries.receivedOn", { date: formatDate(receipt.receivedAt) })}${receipt.supplier ? ` ${t("deliveries.fromSupplier", { name: receipt.supplier.name })}` : ""}`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("deliveries.whatArrived")} description={t("deliveries.whatArrivedHint")} />
          <Table>
            <thead>
              <tr>
                <Th>{t("th.medicine")}</Th>
                <Th className="hidden sm:table-cell">{t("th.batch")}</Th>
                <Th className="hidden sm:table-cell">{t("th.expiry")}</Th>
                <Th className="text-right">{t("th.qty")}</Th>
                <Th className="text-right">{t("th.costEach")}</Th>
                <Th className="text-right">{t("th.lineTotal")}</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <Link href={`/catalogue/${item.variantId}`} className="font-medium hover:underline">
                      {item.variant?.product?.brandName ?? `#${item.variantId}`}
                      {item.variant?.strength ? ` ${item.variant.strength}` : ""}
                    </Link>
                    <p className="text-xs text-muted">{item.variant?.dosageForm}</p>
                  </Td>
                  <Td className="hidden font-mono text-xs sm:table-cell">{item.batchNo ?? "—"}</Td>
                  <Td className="hidden sm:table-cell">{item.expiryDate ? formatDate(item.expiryDate) : "—"}</Td>
                  <Td className="text-right tabular-nums">
                    {item.quantity} <span className="text-xs text-muted">{item.unitName}</span>
                    {item.qtyInBase > 1 && (
                      <p className="text-xs text-muted">= {item.baseQuantity.toLocaleString()} {item.variant?.baseUnit ?? t("common.units")}</p>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums text-muted">{formatCurrency(item.unitCost)}</Td>
                  <Td className="text-right font-medium tabular-nums">{formatCurrency(item.lineCost)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="h-fit">
          <CardHeader title={t("catalogue.details")} />
          <CardBody className="space-y-3 text-sm">
            <Row label={t("deliveries.supplier")} value={receipt.supplier?.name ?? t("catalogue.notRecorded")} />
            <Row label={t("deliveries.theirInvoice")} value={receipt.supplierInvoiceNo ?? "—"} />
            <Row label={t("deliveries.entered")} value={formatDateTime(receipt.createdAt)} />
            <Row label={t("receipt.by")} value={receipt.createdBy?.email ?? "—"} />
            {receipt.note && <Row label={t("deliveries.note")} value={receipt.note} />}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <span>{t("deliveries.totalCost")}</span>
              <span className="tabular-nums">{formatCurrency(receipt.totalCost)}</span>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
