import Link from "next/link";
import { Suspense } from "react";
import { Banknote, Boxes, PackageCheck, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getLowStock, getSummary } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { SUMMARY_PERIODS, type SummaryPeriod } from "@/types";

export const metadata = { title: "Dashboard" };

const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  today: "today",
  this_week: "this week",
  this_month: "this month",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const requested = typeof params.period === "string" ? params.period : "today";
  const period: SummaryPeriod = SUMMARY_PERIODS.includes(requested as SummaryPeriod)
    ? (requested as SummaryPeriod)
    : "today";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the shop is doing, and what needs restocking."
      />

      <PeriodTabs current={period} />

      {/* Each half streams on its own, so a slow query can't hold up the page. */}
      <Suspense key={period} fallback={<SummarySkeleton />}>
        <SummarySection period={period} />
      </Suspense>

      <div className="mt-5">
        <Suspense fallback={<LowStockSkeleton />}>
          <LowStockSection />
        </Suspense>
      </div>
    </>
  );
}

async function SummarySection({ period }: { period: SummaryPeriod }) {
  let summary;
  try {
    summary = await getSummary({ period });
  } catch (error) {
    return (
      <Alert tone="error" title="We couldn't load the sales figures">
        {error instanceof ApiError
          ? error.message
          : "Please refresh the page to try again."}
      </Alert>
    );
  }

  const label = PERIOD_LABELS[period];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Money taken"
        value={formatCurrency(summary.total_earning)}
        hint={`Total collected ${label}, after discounts`}
        icon={Banknote}
      />
      <StatCard
        label="Sales made"
        value={formatNumber(summary.total_transactions)}
        hint={`Separate checkouts ${label}`}
        icon={ReceiptText}
      />
      <StatCard
        label="Items sold"
        value={formatNumber(summary.total_units_sold)}
        hint={`Individual units handed over ${label}`}
        icon={Boxes}
      />
      <StatCard
        label="Different medicines"
        value={formatNumber(summary.distinct_products_sold)}
        hint={`Distinct products that sold ${label}`}
        icon={PackageCheck}
      />
    </div>
  );
}

async function LowStockSection() {
  let items;
  try {
    items = await getLowStock();
  } catch (error) {
    return (
      <Alert tone="error" title="We couldn't load the restocking list">
        {error instanceof ApiError
          ? error.message
          : "Please refresh the page to try again."}
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Needs restocking"
        description="Running low or already out. Lowest stock first."
        action={
          items.length > 0 ? (
            <Badge tone="warning">{items.length} to reorder</Badge>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Nothing needs restocking"
          description="Every medicine that has been counted has enough stock on the shelf. Items nobody has counted yet aren't listed here."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Medicine</Th>
              <Th className="hidden md:table-cell">Made by</Th>
              <Th className="text-right">Left</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.variant_id} className="hover:bg-background/60">
                <Td>
                  <p className="font-medium">
                    {item.brand_name}
                    {item.strength ? ` ${item.strength}` : ""}
                  </p>
                  <p className="text-xs text-muted">{item.dosage_form}</p>
                </Td>
                <Td className="hidden text-muted md:table-cell">{item.manufacturer}</Td>
                <Td className="text-right">
                  {item.stock_quantity === 0 ? (
                    <Badge tone="danger">Out of stock</Badge>
                  ) : (
                    <span className="font-medium tabular-nums text-warning">
                      {item.stock_quantity} left
                    </span>
                  )}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/catalogue/${item.variant_id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Add stock
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
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

function LowStockSkeleton() {
  return (
    <Card>
      <CardHeader title="Needs restocking" description="Checking the shelves…" />
      <div className="space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    </Card>
  );
}
