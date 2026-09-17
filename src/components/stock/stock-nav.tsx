"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

const TABS: { href: string; label: MessageKey }[] = [
  { href: "/stock/receive", label: "stockNav.receive" },
  { href: "/stock/receipts", label: "stockNav.deliveries" },
  { href: "/stock/expiring", label: "stockNav.expiry" },
  { href: "/stock/movements", label: "stockNav.history" },
  { href: "/suppliers", label: "stockNav.suppliers" },
];

/** Sub-navigation shared by every Stock screen. */
export function StockNav() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1" aria-label={t("stockNav.label")}>
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
