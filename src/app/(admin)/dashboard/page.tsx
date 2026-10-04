import { requireOwner } from "@/lib/current-user";
import Link from "next/link";
import { Suspense } from "react";
import { Banknote, Boxes, CalendarClock, CircleCheck, HandCoins, PackageCheck, ReceiptText, Wallet, Warehouse } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { LowStockList } from "@/components/dashboard/low-stock-list";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getExpired, getExpiring, getLowStock, getOutstanding, getSummary } from "@/lib/api/sales";
import { getDailyClosing, getStockValue } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { LinkButton } from "@/components/ui/link-button";
import { CloseDayButton } from "@/components/reports/close-day-button";
import { formatCurrency, formatDate, formatNumber, todayInDhaka } from "@/lib/utils";
import { SUMMARY_PERIODS, type SummaryPeriod } from "@/types";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";

export const metadata = { title: "Dashboard" };

const PERIOD_LABELS: Record<SummaryPeriod, MessageKey> = {
  today: "dashboard.period.today",
  this_week: "dashboard.period.thisWeek",
  this_month: "dashboard.period.thisMonth",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  await requireOwner();
  const t = await getT();
  const params = await searchParams;
  const requested = typeof params.period === "string" ? params.period : "today";
  const period: SummaryPeriod = SUMMARY_PERIODS.includes(requested as SummaryPeriod)
    ? (requested as SummaryPeriod)
    : "today";

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <PeriodTabs current={period} />

      {/* On a phone the count comes first, right under the tabs. Four stat
          cards are four rows at that width, and the one thing here with a
          deadline on it was below all of them. A laptop shows the cards in a
          single row, so there the count keeps its place under them. */}
      <div className="flex flex-col gap-5">
        <div className="order-first lg:order-2">
          <Suspense fallback={null}>
            <CloseDaySection />
          </Suspense>
        </div>

        {/* Each half streams on its own, so a slow query can't hold up the page. */}
        <div className="lg:order-1">
          <Suspense key={period} fallback={<SummarySkeleton />}>
            <SummarySection period={period} />
          </Suspense>
        </div>
      </div>

      <div className="mt-5">
        <Suspense fallback={null}>
          <OutstandingSection />
        </Suspense>
      </div>

      <div className="mt-5">
        <Suspense fallback={null}>
          <ExpirySection />
        </Suspense>
      </div>

      <div className="mt-5">
        <Suspense fallback={<LowStockSkeleton />}>
          <LowStockSection />
        </Suspense>
      </div>
    </>
  );
}

/**
 * The end-of-day count, from the screen the owner already has open.
 *
 * It lives three taps away under Reports, and an owner who does not find it
 * does not count the drawer — which is the one thing keeping the expected
 * figure from drifting further from the cash every day. Here it says what
 * the drawer should hold and goes straight there.
 */
async function CloseDaySection() {
  const t = await getT();
  let report;
  try {
    report = await getDailyClosing(todayInDhaka());
  } catch {
    // An API that predates the closings table answers with nothing useful,
    // and the dashboard is not the place to report that.
    return null;
  }

  const closing = report.closing;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {closing ? (
              <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden />
            ) : (
              <Wallet className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            )}
            {closing ? t("closeDay.done") : t("closeDay.notYet")}
          </p>
          <p className="mt-1 text-xs text-muted">
            {closing
              ? closing.difference === 0
                ? t("closeDay.matched")
                : `${closing.difference < 0 ? t("closeDay.short") : t("closeDay.over")} ${formatCurrency(Math.abs(closing.difference))}`
              : t("closeDay.expectedNow", { amount: formatCurrency(report.cash_in_drawer_expected) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CloseDayButton
            date={report.date}
            expected={report.cash_in_drawer_expected}
            closing={closing ?? null}
          />
          <LinkButton href="/reports/daily-closing" variant="secondary">
            {t("closeDay.seeDay")}
          </LinkButton>
        </div>
      </div>
    </Card>
  );
}

/**
 * Money that has been sold but not collected, and stock that has been taken
 * but not paid for. Neither moves with the period tabs above — they are
 * balances as of now, which is how the owner thinks about them.
 */
async function OutstandingSection() {
  const t = await getT();
  let owed;
  try {
    owed = await getOutstanding();
  } catch {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/customers/due" className="block">
        <StatCard
          label={t("dashboard.customersOwe")}
          value={formatCurrency(owed.customers_owe)}
          hint={
            owed.customers_count === 0
              ? t("dashboard.nobodyOwes")
              : t("dashboard.owedBy", {
                  count: owed.customers_count,
                  since: owed.customers_oldest ? formatDate(owed.customers_oldest) : "—",
                })
          }
          icon={HandCoins}
          tone={owed.customers_owe > 0 ? "warning" : "default"}
        />
      </Link>
      <Link href="/suppliers/due" className="block">
        <StatCard
          label={t("dashboard.shopOwes")}
          value={formatCurrency(owed.shop_owes)}
          hint={
            owed.suppliers_count === 0
              ? t("dashboard.oweNobody")
              : t("dashboard.oweTo", {
                  count: owed.suppliers_count,
                  since: owed.suppliers_oldest ? formatDate(owed.suppliers_oldest) : "—",
                })
          }
          icon={Wallet}
          tone={owed.shop_owes > 0 ? "warning" : "default"}
        />
      </Link>
    </div>
  );
}

/** Two numbers the owner should see every morning: expired on the shelf, and expiring soon. */
async function ExpirySection() {
  const t = await getT();
  let expiring;
  let expired;
  try {
    [expiring, expired] = await Promise.all([getExpiring(30), getExpired()]);
  } catch {
    return null;
  }
  let stockValue = null;
  try {
    stockValue = await getStockValue();
  } catch {
    stockValue = null;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stockValue && (
        <Link href="/reports" className="block">
          <StatCard
            label={t("dashboard.stockAtCost")}
            value={formatCurrency(stockValue.value_at_cost)}
            hint={`${t("dashboard.worthAtPrice", { amount: formatCurrency(stockValue.value_at_price) })}${stockValue.uncosted_units > 0 ? ` · ${t("dashboard.unitsNoCost", { count: formatNumber(stockValue.uncosted_units) })}` : ""}`}
            icon={Warehouse}
          />
        </Link>
      )}
      <Link href="/stock/expiring?tab=expired" className="block">
        <StatCard
          label={t("dashboard.expiredOnShelf")}
          value={formatNumber(expired.length)}
          hint={expired.length === 0 ? t("dashboard.nothingExpired") : t("dashboard.expiredHint")}
          icon={CalendarClock}
          tone={expired.length > 0 ? "danger" : "default"}
        />
      </Link>
      <Link href="/stock/expiring" className="block">
        <StatCard
          label={t("dashboard.expiring30")}
          value={formatNumber(expiring.length)}
          hint={expiring.length === 0 ? t("dashboard.noneExpiring") : t("dashboard.expiringHint")}
          icon={CalendarClock}
          tone={expiring.length > 0 ? "warning" : "default"}
        />
      </Link>
    </div>
  );
}

async function SummarySection({ period }: { period: SummaryPeriod }) {
  const t = await getT();
  let summary;
  try {
    summary = await getSummary({ period });
  } catch (error) {
    return (
      <Alert tone="error" title={t("dashboard.summaryError")}>
        {error instanceof ApiError
          ? error.message
          : t("common.refresh")}
      </Alert>
    );
  }

  const label = t(PERIOD_LABELS[period]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label={t("dashboard.moneyTaken")}
        value={formatCurrency(summary.total_earning)}
        hint={t("dashboard.moneyTakenHint", { period: label })}
        icon={Banknote}
      />
      <StatCard
        label={t("dashboard.salesMade")}
        value={formatNumber(summary.total_transactions)}
        hint={t("dashboard.salesMadeHint", { period: label })}
        icon={ReceiptText}
      />
      <StatCard
        label={t("dashboard.itemsSold")}
        value={formatNumber(summary.total_units_sold)}
        hint={t("dashboard.itemsSoldHint", { period: label })}
        icon={Boxes}
      />
      <StatCard
        label={t("dashboard.distinct")}
        value={formatNumber(summary.distinct_products_sold)}
        hint={t("dashboard.distinctHint", { period: label })}
        icon={PackageCheck}
      />
    </div>
  );
}

async function LowStockSection() {
  const t = await getT();
  let items;
  try {
    items = await getLowStock();
  } catch (error) {
    return (
      <Alert tone="error" title={t("dashboard.lowStockError")}>
        {error instanceof ApiError
          ? error.message
          : t("common.refresh")}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        title={t("dashboard.needsRestocking")}
        description={t("dashboard.needsRestockingHint")}
        action={
          items.length > 0 ? (
            <Badge tone="warning">{t("dashboard.toReorder", { count: items.length })}</Badge>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={t("dashboard.nothingLow")}
          description={t("dashboard.nothingLowHint")}
        />
      ) : (
        <LowStockList items={items} />
      )}
    </Card>
  );
}

function SummarySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-26 animate-pulse rounded-xl bg-surface" />
      ))}
    </div>
  );
}

async function LowStockSkeleton() {
  const t = await getT();
  return (
    <Card>
      <CardHeader title={t("dashboard.needsRestocking")} description={t("dashboard.checkingShelves")} />
      <div className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    </Card>
  );
}
