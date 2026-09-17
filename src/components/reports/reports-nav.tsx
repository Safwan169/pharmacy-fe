"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/reports/daily-closing", label: "Daily closing" },
  { href: "/reports/profit", label: "Profit" },
  { href: "/reports", label: "Stock value" },
];

export function ReportsNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1 print:hidden" aria-label="Reports">
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-background print:hidden"
    >
      {label}
    </button>
  );
}
