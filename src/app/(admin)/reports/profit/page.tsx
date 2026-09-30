import Link from "next/link";
import Form from "next/form";
import { PageHeader } from "@/components/layout/page-header";
import { PrintButton, ReportsNav } from "@/components/reports/reports-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Banknote, Percent, Search, TrendingUp } from "lucide-react";
import { getProfit } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatDate, formatNumber, todayInDhaka } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Profit" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ProfitPage({ searchParams }: PageProps<"/reports/profit">) {
  await requireOwner();
  const t = await getT();
  const params = await searchParams;
  const today = todayInDhaka();
  const to = typeof params.to === "string" && DATE.test(params.to) ? params.to : today;
  const from = typeof params.from === "string" && DATE.test(params.from) ? params.from : `${to.slice(0, 7)}-01`;

  let report;
  try {
    report = await getProfit(from, to);
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }
  const total = report.total;

  return (
    <>
      <PageHeader
        title={t("reports.profit")}
        description={t("profit.description")}
        action={
          <span className="flex gap-2">
            <a
              href={`/api/reports/csv?report=profit&from=${from}&to=${to}`}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background print:hidden"
            >
              {t("common.csv")}
            </a>
            <PrintButton />
          </span>
        }
      />
      <ReportsNav />

      {/* Two dates and a button take two ragged rows on a phone if they are
          left to wrap. The word between the dates is a nicety at that width
          and the button is the magnifier alone; both come back from the small
          breakpoint up. */}
      <Form className="mb-5 grid grid-cols-[1fr_1fr_auto] items-center gap-2 print:hidden sm:flex sm:flex-wrap" action="/reports/profit">
        <input type="date" name="from" defaultValue={from} max={today} className="h-10 min-w-0 rounded-lg border border-border bg-surface px-2 text-sm sm:px-3" aria-label={t("common.from")} />
        <span className="hidden text-sm text-muted sm:inline">{t("common.to")}</span>
        <input type="date" name="to" defaultValue={to} max={today} className="h-10 min-w-0 rounded-lg border border-border bg-surface px-2 text-sm sm:px-3" aria-label={t("common.toDate")} />
        <button
          type="submit"
          aria-label={t("common.show")}
          className="flex h-10 w-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-background sm:w-auto sm:px-4"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("common.show")}</span>
        </button>
      </Form>

      {total.uncosted_lines > 0 && (
        <Alert tone="warning" className="mb-5">
          {t("profit.uncosted", { count: formatNumber(total.uncosted_lines) })}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("profit.revenue")} value={formatCurrency(total.revenue)} hint={`${formatDate(from)} – ${formatDate(to)}`} icon={Banknote} />
        <StatCard label={t("profit.cogs")} value={formatCurrency(total.cogs)} icon={Banknote} />
        <StatCard label={t("profit.gross")} value={formatCurrency(total.gross_profit)} hint={total.margin_pct === null ? undefined : t("profit.margin", { pct: total.margin_pct })} icon={TrendingUp} tone={total.gross_profit < 0 ? "danger" : "default"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("profit.byDay")} />
          {report.by_day.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("profit.noSales")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("common.day")}</Th>
                  <Th className="text-right">{t("profit.revenue")}</Th>
                  <Th className="hidden text-right sm:table-cell">{t("th.cost")}</Th>
                  <Th className="text-right">{t("reports.profit")}</Th>
                  <Th className="hidden text-right sm:table-cell"><Percent className="inline h-3 w-3" aria-label={t("profit.marginLabel")} /></Th>
                </tr>
              </thead>
              <tbody>
                {report.by_day.map((d) => (
                  <tr key={d.date}>
                    <Td>
                      <Link href={`/reports/daily-closing?date=${d.date}`} className="hover:underline">{formatDate(d.date)}</Link>
                    </Td>
                    <Td className="text-right tabular-nums">{formatCurrency(d.revenue)}</Td>
                    <Td className="hidden text-right tabular-nums text-muted sm:table-cell">{formatCurrency(d.cogs)}</Td>
                    <Td className={`text-right font-medium tabular-nums ${d.gross_profit < 0 ? "text-danger" : ""}`}>{formatCurrency(d.gross_profit)}</Td>
                    <Td className="hidden text-right tabular-nums text-muted sm:table-cell">{d.margin_pct === null ? "—" : `${d.margin_pct}%`}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title={t("profit.topMedicines")} />
          {report.by_product.length === 0 ? (
            <p className="p-5 text-sm text-muted">{t("profit.nothingSold")}</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>{t("th.medicine")}</Th>
                  <Th className="hidden text-right sm:table-cell">{t("profit.revenue")}</Th>
                  <Th className="text-right">{t("reports.profit")}</Th>
                </tr>
              </thead>
              <tbody>
                {report.by_product.map((p) => (
                  <tr key={p.variant_id}>
                    <Td>
                      <Link href={`/catalogue/${p.variant_id}`} className="hover:underline">{p.name}</Link>
                      <p className="text-xs text-muted">{formatNumber(p.quantity_base)} {t("common.units")}</p>
                    </Td>
                    <Td className="hidden text-right tabular-nums text-muted sm:table-cell">{formatCurrency(p.revenue)}</Td>
                    <Td className={`text-right font-medium tabular-nums ${p.gross_profit < 0 ? "text-danger" : ""}`}>{formatCurrency(p.gross_profit)}</Td>
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
