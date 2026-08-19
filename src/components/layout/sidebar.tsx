"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Tags,
  ShoppingCart,
  ReceiptText,
  Upload,
  Cross,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One entry per stage of the workflow the API is built around: price the
 * catalogue, sell at the counter, then monitor and restock.
 */
export const navigation = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    hint: "Sales figures and what needs restocking",
  },
  {
    href: "/pos",
    label: "Counter",
    icon: ShoppingCart,
    hint: "Ring up a sale",
  },
  {
    href: "/catalogue",
    label: "Catalogue",
    icon: Search,
    hint: "Search every medicine",
  },
  {
    href: "/pricing",
    label: "Pricing",
    icon: Tags,
    hint: "Set prices and stock",
  },
  {
    href: "/sales",
    label: "Sales",
    icon: ReceiptText,
    hint: "Past sales and invoices",
  },
  {
    href: "/import",
    label: "Import",
    icon: Upload,
    hint: "Load the catalogue from a CSV",
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {navigation.map(({ href, label, icon: Icon, hint }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={hint}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-border px-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <Cross className="h-4 w-4 text-primary-foreground" aria-hidden />
      </span>
      <span className="text-sm font-semibold">Pharmacy</span>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <Brand />
      <SidebarNav />
    </aside>
  );
}

/** The same navigation as a slide-over, for phones and tablets. */
export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30"
      />
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border pr-2">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  );
}
