import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { PaySupplier } from "@/components/stock/supplier-payment";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { getSupplierDueList } from "@/lib/api/stock";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "We owe" };

export default async function SupplierDuePage() {
  await requireOwner();
  const t = await getT();
  let rows;
  try {
    rows = await getSupplierDueList();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }
  const total = rows.reduce((sum, r) => sum + r.due_balance, 0);

  return (
    <>
      <PageHeader
        title={t("supplierDue.title")}
        description={rows.length === 0 ? t("supplierDue.nobody") : t("supplierDue.summary", { count: rows.length, amount: formatCurrency(total) })}
        action={<LinkButton href="/suppliers" variant="secondary">{t("stockNav.suppliers")}</LinkButton>}
      />
      <StockNav />
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={CircleCheck} title={t("supplierDue.none")} description={t("supplierDue.noneHint")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("deliveries.supplier")}</Th>
                <Th className="hidden sm:table-cell">{t("supplierDue.owedSince")}</Th>
                <Th className="text-right">{t("supplierDue.weOwe")}</Th>
                <Th className="text-right">{t("supplierPay.button")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <Td>
                    <Link href={`/suppliers/${r.id}`} className="font-medium text-primary hover:underline">{r.name}</Link>
                    {r.phone && <p className="text-xs text-muted">{r.phone}</p>}
                  </Td>
                  <Td className="hidden text-muted sm:table-cell">
                    {r.oldest_due_at ? formatDate(r.oldest_due_at) : "—"}
                    {r.open_receipts > 0 && <p className="text-xs">{t("supplierDue.openReceipts", { count: r.open_receipts })}</p>}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums text-warning">{formatCurrency(r.due_balance)}</Td>
                  <Td className="text-right">
                    <PaySupplier supplierId={r.id} dueBalance={r.due_balance} compact />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
