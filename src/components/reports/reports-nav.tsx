"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

const TABS: { href: string; label: MessageKey }[] = [
  { href: "/reports/daily-closing", label: "reports.dailyClosing" },
  { href: "/reports/profit", label: "reports.profit" },
  { href: "/reports", label: "reports.stockValue" },
  { href: "/audit", label: "audit.title" },
];

export function ReportsNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 print:hidden" aria-label={t("nav.reports")}>
      {TABS.map(({ href, label }) => {
        const active = href === "/reports" ? pathname === "/reports" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

export function PrintButton({ label }: { label?: string }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background print:hidden"
    >
      {label ?? t("common.print")}
    </button>
  );
}
