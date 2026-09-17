import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { ReportsNav } from "@/components/reports/reports-nav";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Boxes, CalendarClock, Tag, Warehouse } from "lucide-react";
import { getStockValue } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { requireOwner } from "@/lib/current-user";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getT } from "@/i18n/server";

export const metadata = { title: "Reports" };

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

      <Card className="mt-5">
        <CardHeader title={t("reports.other")} />
        <CardBody className="flex flex-wrap gap-4 text-sm">
          <Link href="/reports/daily-closing" className="text-primary hover:underline">{t("reports.dailyClosingLink")}</Link>
          <Link href="/reports/profit" className="text-primary hover:underline">{t("reports.profitLink")}</Link>
          <Link href="/customers/due" className="text-primary hover:underline">{t("customers.whoOwes")}</Link>
          <Link href="/stock/expiring" className="text-primary hover:underline">{t("stockNav.expiry")}</Link>
        </CardBody>
      </Card>
    </>
  );
}
