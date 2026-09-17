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
import { getT } from "@/i18n/server";
import type { MessageKey, Translate } from "@/i18n";

export const metadata = { title: "Expiry" };

type Tab = ExpiryWindow | "expired";

const TABS: { value: Tab; label: MessageKey }[] = [
  { value: "expired", label: "expiry.expired" },
  { value: 30, label: "expiry.within30" },
  { value: 60, label: "expiry.within60" },
  { value: 90, label: "expiry.within90" },
];

export default async function ExpiringPage({ searchParams }: PageProps<"/stock/expiring">) {
  const t = await getT();
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
        title={t("expiry.title")}
        description={t("expiry.description")}
      />
      <StockNav />

      <div
        className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1"
        role="group"
        aria-label={t("expiry.chooseWindow")}
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
              {t(label)}
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
  const t = await getT();
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
          title={tab === "expired" ? t("expiry.noneExpired") : t("expiry.noneInWindow")}
          description={tab === "expired" ? t("expiry.noneExpiredHint") : t("expiry.noneInWindowHint")}
        />
      </Card>
    );
  }

  const totalValue = items.reduce((sum, i) => sum + (i.value_at_cost ?? 0), 0);

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-3 text-sm text-muted">
        <span>
          {t(items.length === 1 ? "expiry.batchCount" : "expiry.batchesCount", { count: items.length })}
        </span>
        {totalValue > 0 && <span>{t("expiry.worthAtCost", { amount: formatCurrency(totalValue) })}</span>}
      </div>
      <Table>
        <thead>
          <tr>
            <Th>{t("th.medicine")}</Th>
            <Th className="hidden md:table-cell">{t("th.batch")}</Th>
            <Th>{t("expiry.expires")}</Th>
            <Th className="text-right">{t("th.left")}</Th>
            <Th className="hidden text-right sm:table-cell">{t("expiry.atCost")}</Th>
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
                <DaysBadge days={item.days_left} t={t} />
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

function DaysBadge({ days, t }: { days: number; t: Translate }) {
  if (days < 0) {
    return <Badge tone="danger">{t("expiry.daysAgo", { days: -days })}</Badge>;
  }
  if (days === 0) return <Badge tone="danger">{t("period.today")}</Badge>;
  return (
    <Badge tone={days <= 30 ? "danger" : "warning"}>
      {t("expiry.daysLeft", { days })}
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
