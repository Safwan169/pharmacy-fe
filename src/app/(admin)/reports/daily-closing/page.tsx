import Link from "next/link";
import Form from "next/form";
import { PageHeader } from "@/components/layout/page-header";
import { PrintButton, ReportsNav } from "@/components/reports/reports-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Banknote, ReceiptText, Undo2, Wallet } from "lucide-react";
import { getDailyClosing } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatDate, formatNumber, todayInDhaka } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Daily closing" };

export default async function DailyClosingPage({ searchParams }: PageProps<"/reports/daily-closing">) {
  await requireOwner();
  const t = await getT();
  const params = await searchParams;
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayInDhaka();

  let report;
  try {
    report = await getDailyClosing(date);
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }

  return (
    <>
      <PageHeader
        title={t("reports.dailyClosing")}
        description={`${formatDate(report.date)} — ${t("closing.description")}`}
        action={
          <span className="flex gap-2">
            <a
              href={`/api/reports/csv?report=daily-closing&date=${report.date}`}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background print:hidden"
            >
              {t("common.csv")}
            </a>
            <PrintButton label={t("closing.print")} />
          </span>
        }
      />
      <ReportsNav />

      <Form className="mb-5 flex items-center gap-2 print:hidden" action="/reports/daily-closing">
        <label htmlFor="date" className="text-sm text-muted">{t("common.day")}</label>
        <input id="date" type="date" name="date" defaultValue={date} max={todayInDhaka()} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">{t("common.show")}</button>
      </Form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("closing.netSales")} value={formatCurrency(report.net_sales)} hint={t("closing.netSalesHint", { count: formatNumber(report.sales_count), discounts: formatCurrency(report.discounts) })} icon={ReceiptText} />
        <StatCard label={t("closing.cashExpected")} value={formatCurrency(report.cash_in_drawer_expected)} hint={t("closing.cashExpectedHint2")} icon={Wallet} />
        <StatCard label={t("closing.bkashToday")} value={formatCurrency(report.by_method.bkash + report.due_collected.bkash)} hint={t("closing.bkashHint", { sales: formatCurrency(report.by_method.bkash), due: formatCurrency(report.due_collected.bkash) })} icon={Banknote} />
        <StatCard label={t("closing.refunds")} value={formatCurrency(report.refunds)} hint={t("closing.voided", { count: formatNumber(report.voided_count) })} icon={Undo2} tone={report.refunds > 0 ? "warning" : "default"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("closing.byMethod")} />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {report.opening_cash !== null && (
                <Row label={t("closing.openingCash")} value={report.opening_cash} />
              )}
              <Row label={t("closing.cashSales")} value={report.by_method.cash} />
              <Row label={t("closing.bkashSales")} value={report.by_method.bkash} />
              <Row label={t("closing.onAccount")} value={report.by_method.due} muted />
              <Row label={t("closing.dueCash")} value={report.due_collected.cash} />
              <Row label={t("closing.dueBkash")} value={report.due_collected.bkash} />
              <Row label={t("closing.refundCash")} value={-report.refunds_by_method.cash} />
              <Row label={t("closing.refundBkash")} value={-report.refunds_by_method.bkash} />
              <Row label={t("closing.refundDue")} value={-report.refunds_by_method.due_adjust} muted />
              <Row label={t("closing.supplierCash")} value={-report.supplier_paid.cash} />
              {report.supplier_paid.cash_outside > 0 && (
                <Row label={t("closing.supplierOutside")} value={report.supplier_paid.cash_outside} muted />
              )}
              <Row label={t("closing.supplierBkash")} value={-report.supplier_paid.bkash} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>{t("closing.cashExpected")}</dt>
                <dd className="tabular-nums">{formatCurrency(report.cash_in_drawer_expected)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("closing.byCashier")} />
          {report.cashier_breakdown.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("closing.noSales")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("role.cashier")}</Th>
                  <Th className="text-right">{t("nav.sales")}</Th>
                  <Th className="text-right">{t("th.amount")}</Th>
                </tr>
              </thead>
              <tbody>
                {report.cashier_breakdown.map((c) => (
                  <tr key={c.user_id}>
                    <Td>{c.name}</Td>
                    <Td className="text-right tabular-nums">{c.sales_count}</Td>
                    <Td className="text-right font-medium tabular-nums">{formatCurrency(c.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("closing.topSellers")} />
          {report.top_items.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("profit.nothingSold")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.medicine")}</Th>
                  <Th className="text-right">{t("movement.sale")}</Th>
                  <Th className="text-right">{t("th.amount")}</Th>
                </tr>
              </thead>
              <tbody>
                {report.top_items.map((i) => (
                  <tr key={`${i.variant_id}-${i.unit}`}>
                    <Td>
                      <Link href={`/catalogue/${i.variant_id}`} className="hover:underline">{i.name}</Link>
                    </Td>
                    <Td className="text-right tabular-nums">{i.quantity} <span className="text-xs text-muted">{i.unit}</span></Td>
                    <Td className="text-right font-medium tabular-nums">{formatCurrency(i.amount)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted" : ""}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums ${value < 0 ? "text-danger" : ""}`}>{value < 0 ? `−${formatCurrency(-value)}` : formatCurrency(value)}</dd>
    </div>
  );
}
