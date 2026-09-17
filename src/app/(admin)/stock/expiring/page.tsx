import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StockNav } from "@/components/stock/stock-nav";
import { Card } from "@/components/ui/card";
import { Table, Th, Td } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WriteOffButton } from "@/components/stock/write-off-button";
import { getExpired, getExpiring } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { EXPIRY_WINDOWS, type ExpiringItem, type ExpiryWindow } from "@/types";

export const metadata = { title: "Expiry" };

type Tab = ExpiryWindow | "expired";

const TABS: { value: Tab; label: string }[] = [
  { value: "expired", label: "Expired" },
  { value: 30, label: "Within 30 days" },
  { value: 60, label: "Within 60 days" },
  { value: 90, label: "Within 90 days" },
];

export default async function ExpiringPage({ searchParams }: PageProps<"/stock/expiring">) {
  const params = await searchParams;
  const raw = typeof params.tab === "string" ? params.tab : "30";
  const tab: Tab =
    raw === "expired"
      ? "expired"
      : EXPIRY_WINDOWS.includes(Number(raw) as ExpiryWindow)
        ? (Number(raw) as ExpiryWindow)
        : 30;

  return (
    <>
      <PageHeader
        title="Expiry dates"
        description="Batches that are past their date or getting close. Sell the closest first, or write off what's expired."
      />
      <StockNav />

      <div
        className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1"
        role="group"
        aria-label="Choose a window"
      >
        {TABS.map(({ value, label }) => {
          const active = value === tab;
          return (
            <Link
              key={String(value)}
              href={value === 30 ? "/stock/expiring" : `/stock/expiring?tab=${value}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <Suspense key={String(tab)} fallback={<Skeleton />}>
        <ExpiryList tab={tab} />
      </Suspense>
    </>
  );
}

async function ExpiryList({ tab }: { tab: Tab }) {
  let items: ExpiringItem[];
  try {
    items = tab === "expired" ? await getExpired() : await getExpiring(tab);
  } catch (error) {
    if (error instanceof ApiError) {
      return <Alert tone="error">{error.message}</Alert>;
    }
    throw error;
  }

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={CalendarClock}
          title={tab === "expired" ? "Nothing has expired" : "Nothing expiring in this window"}
          description={
            tab === "expired"
              ? "Every batch on the shelf is still within its date."
              : "Check a longer window to plan ahead."
          }
        />
      </Card>
    );
  }

  const totalValue = items.reduce((sum, i) => sum + (i.value_at_cost ?? 0), 0);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
        <span>
          {items.length} {items.length === 1 ? "batch" : "batches"}
        </span>
        {totalValue > 0 && <span>Worth about {formatCurrency(totalValue)} at cost</span>}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Medicine</Th>
            <Th className="hidden md:table-cell">Batch</Th>
            <Th>Expires</Th>
            <Th className="text-right">Left</Th>
            <Th className="hidden text-right sm:table-cell">At cost</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.batch_id} className="hover:bg-background/60">
              <Td>
                <Link href={`/catalogue/${item.variant_id}`} className="font-medium hover:underline">
                  {item.brand_name}
                  {item.strength ? ` ${item.strength}` : ""}
                </Link>
                <p className="text-xs text-muted">
                  {item.dosage_form} · {item.manufacturer}
                </p>
              </Td>
              <Td className="hidden font-mono text-xs md:table-cell">{item.batch_no ?? "—"}</Td>
              <Td>
                <p>{formatDate(item.expiry_date)}</p>
                <DaysBadge days={item.days_left} />
              </Td>
              <Td className="text-right tabular-nums">
                {item.quantity.toLocaleString()}{" "}
                <span className="text-xs text-muted">{item.base_unit}</span>
              </Td>
              <Td className="hidden text-right tabular-nums text-muted sm:table-cell">
                {item.value_at_cost === null ? "—" : formatCurrency(item.value_at_cost)}
              </Td>
              <Td className="text-right">
                {item.days_left < 0 && (
                  <WriteOffButton batchId={item.batch_id} variantId={item.variant_id} />
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

function DaysBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <Badge tone="danger">
        {-days} {-days === 1 ? "day" : "days"} ago
      </Badge>
    );
  }
  if (days === 0) return <Badge tone="danger">Today</Badge>;
  return (
    <Badge tone={days <= 30 ? "danger" : "warning"}>
      {days} {days === 1 ? "day" : "days"} left
    </Badge>
  );
}

function Skeleton() {
  return (
    <Card>
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-background" />
        ))}
      </div>
    </Card>
  );
}
