import Link from "next/link";
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

export const metadata = { title: "Daily closing" };

export default async function DailyClosingPage({ searchParams }: PageProps<"/reports/daily-closing">) {
  await requireOwner();
  const params = await searchParams;
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayInDhaka();

  let report;
  try {
    report = await getDailyClosing(date);
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : "Please refresh to try again."}</Alert>;
  }

  return (
    <>
      <PageHeader
        title="Daily closing"
        description={`${formatDate(report.date)} — what came in, and what should be in the drawer.`}
        action={
          <span className="flex gap-2">
            <a
              href={`/api/reports/csv?report=daily-closing&date=${report.date}`}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background print:hidden"
            >
              CSV
            </a>
            <PrintButton label="Print closing" />
          </span>
        }
      />
      <ReportsNav />

      <form className="mb-5 flex items-center gap-2 print:hidden" action="/reports/daily-closing">
        <label htmlFor="date" className="text-sm text-muted">Day</label>
        <input id="date" type="date" name="date" defaultValue={date} max={todayInDhaka()} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm" />
        <button type="submit" className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background">Show</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net sales" value={formatCurrency(report.net_sales)} hint={`${formatNumber(report.sales_count)} sales · ${formatCurrency(report.discounts)} discounts`} icon={ReceiptText} />
        <StatCard label="Cash in drawer expected" value={formatCurrency(report.cash_in_drawer_expected)} hint="Cash sales + cash due collected − cash refunds" icon={Wallet} />
        <StatCard label="bKash today" value={formatCurrency(report.by_method.bkash + report.due_collected.bkash)} hint={`${formatCurrency(report.by_method.bkash)} sales · ${formatCurrency(report.due_collected.bkash)} due collected`} icon={Banknote} />
        <StatCard label="Refunds" value={formatCurrency(report.refunds)} hint={`${formatNumber(report.voided_count)} voided`} icon={Undo2} tone={report.refunds > 0 ? "warning" : "default"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Takings by method" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              <Row label="Cash sales" value={report.by_method.cash} />
              <Row label="bKash sales" value={report.by_method.bkash} />
              <Row label="On account (due)" value={report.by_method.due} muted />
              <Row label="Due collected — cash" value={report.due_collected.cash} />
              <Row label="Due collected — bKash" value={report.due_collected.bkash} />
              <Row label="Refunds — cash" value={-report.refunds_by_method.cash} />
              <Row label="Refunds — bKash" value={-report.refunds_by_method.bkash} />
              <Row label="Refunds — off due balance" value={-report.refunds_by_method.due_adjust} muted />
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Cash in drawer expected</dt>
                <dd className="tabular-nums">{formatCurrency(report.cash_in_drawer_expected)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="By cashier" />
          {report.cashier_breakdown.length === 0 ? (
            <p className="p-5 text-sm text-muted">No sales.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Cashier</Th>
                  <Th className="text-right">Sales</Th>
                  <Th className="text-right">Amount</Th>
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
          <CardHeader title="Top sellers today" />
          {report.top_items.length === 0 ? (
            <p className="p-5 text-sm text-muted">Nothing sold.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Medicine</Th>
                  <Th className="text-right">Sold</Th>
                  <Th className="text-right">Amount</Th>
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
