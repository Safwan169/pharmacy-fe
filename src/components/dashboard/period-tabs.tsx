"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SummaryPeriod } from "@/types";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

const TABS: { value: SummaryPeriod; label: MessageKey }[] = [
  { value: "today", label: "period.today" },
  { value: "this_week", label: "period.thisWeek" },
  { value: "this_month", label: "period.thisMonth" },
];

/**
 * Plain links rather than buttons: the period lives in the URL, so a chosen
 * range survives a refresh and can be bookmarked or shared.
 */
export function PeriodTabs({ current }: { current: SummaryPeriod }) {
  const t = useT();
  return (
    <div
      className="mb-5 inline-flex rounded-lg border border-border bg-surface p-1"
      role="group"
      aria-label={t("period.choose")}
    >
      {TABS.map(({ value, label }) => {
        const active = value === current;
        return (
          <Link
            key={value}
            href={value === "today" ? "/dashboard" : `/dashboard?period=${value}`}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {t(label)}
          </Link>
        );
      })}
    </div>
  );
}
