import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Boxes, CalendarClock, ChevronRight, HandCoins, TrendingUp, Tag, Wallet, Warehouse } from "lucide-react";
import { getStockValue } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Reports" };

function ReportLink({
  href,
  icon: Icon,
  title,
  what,
}: {
  href: string;
  icon: typeof Wallet;
  title: string;
  what: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary/60 hover:bg-background"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{what}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </Link>
  );
}

export default async function ReportsPage() {
  await requireOwner();
  const t = await getT();
  let value;
  try {
    value = await getStockValue();
  } catch (error) {
    return <Alert tone="error">{error instanceof ApiError ? error.message : t("common.refresh")}</Alert>;
  }

  return (
    <>
      <PageHeader title={t("nav.reports")} description={t("reports.description")} />
      <ReportsNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("reports.stockAtCost")} value={formatCurrency(value.value_at_cost)} hint={t("reports.stockAtCostHint")} icon={Warehouse} />
        <StatCard label={t("reports.stockAtPrice")} value={formatCurrency(value.value_at_price)} hint={t("reports.stockAtPriceHint")} icon={Tag} />
        <StatCard label={t("reports.expiredAtCost")} value={formatCurrency(value.expired_value_at_cost)} hint={t("reports.expiredAtCostHint")} icon={CalendarClock} tone={value.expired_value_at_cost > 0 ? "danger" : "default"} />
        <StatCard label={t("reports.batchesOnShelf")} value={formatNumber(value.batches_in_stock)} hint={t("reports.differentMedicines", { count: formatNumber(value.variants_in_stock) })} icon={Boxes} />
      </div>

      {value.uncosted_units > 0 && (
        <Alert tone="warning" className="mt-5">
          {t("reports.uncosted", { count: formatNumber(value.uncosted_units) })}
        </Alert>
      )}

      {/* These were four sentences run together on one line, each naming the
          report and then explaining its arithmetic. Nobody reads a link that
          says "revenue less cost of goods". A tile each: what it is called,
          and the question it answers in the words a shopkeeper would use. */}
      <Card className="mt-5">
        <CardHeader title={t("reports.other")} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <ReportLink href="/reports/daily-closing" icon={Wallet} title={t("reports.dailyClosing")} what={t("reports.dailyClosingWhat")} />
          <ReportLink href="/reports/profit" icon={TrendingUp} title={t("reports.profit")} what={t("reports.profitWhat")} />
          <ReportLink href="/customers/due" icon={HandCoins} title={t("customers.whoOwes")} what={t("reports.whoOwesWhat")} />
          <ReportLink href="/stock/expiring" icon={CalendarClock} title={t("stockNav.expiry")} what={t("reports.expiryWhat")} />
        </CardBody>
      </Card>
    </>
  );
}
