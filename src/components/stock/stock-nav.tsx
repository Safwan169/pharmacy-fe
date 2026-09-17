"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/stock/receive", label: "Receive" },
  { href: "/stock/receipts", label: "Deliveries" },
  { href: "/stock/expiring", label: "Expiry" },
  { href: "/stock/movements", label: "History" },
  { href: "/suppliers", label: "Suppliers" },
];

/** Sub-navigation shared by every Stock screen. */
export function StockNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-5 flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1" aria-label="Stock sections">
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
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
