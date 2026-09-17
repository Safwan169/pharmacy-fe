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
  Boxes,
  Cross,
  X,
  Users,
  Contact,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

/**
 * One entry per stage of the workflow the API is built around: price the
 * catalogue, sell at the counter, then monitor and restock.
 */
export const navigation = [
  {
    href: "/dashboard",
    label: "nav.dashboard" as MessageKey,
    icon: LayoutDashboard,
    hint: "nav.dashboard.hint" as MessageKey,
    ownerOnly: true,
  },
  {
    href: "/pos",
    label: "nav.pos" as MessageKey,
    icon: ShoppingCart,
    hint: "nav.pos.hint" as MessageKey,
  },
  {
    href: "/catalogue",
    label: "nav.catalogue" as MessageKey,
    icon: Search,
    hint: "nav.catalogue.hint" as MessageKey,
  },
  // {
  //   href: "/pricing",
  //   label: "nav.pricing",
  //   icon: Tags,
  //   hint: "nav.pricing.hint",
  // },
  {
    href: "/stock",
    label: "nav.stock" as MessageKey,
    icon: Boxes,
    hint: "nav.stock.hint" as MessageKey,
    ownerOnly: true,
  },
  {
    href: "/sales",
    label: "nav.sales" as MessageKey,
    icon: ReceiptText,
    hint: "nav.sales.hint" as MessageKey,
  },
  {
    href: "/customers",
    label: "nav.customers" as MessageKey,
    icon: Contact,
    hint: "nav.customers.hint" as MessageKey,
  },
  {
    href: "/import",
    label: "nav.import" as MessageKey,
    icon: Upload,
    hint: "nav.import.hint" as MessageKey,
    ownerOnly: true,
  },
  {
    href: "/reports",
    label: "nav.reports" as MessageKey,
    icon: BarChart3,
    hint: "nav.reports.hint" as MessageKey,
    ownerOnly: true,
  },
  {
    href: "/users",
    label: "nav.users" as MessageKey,
    icon: Users,
    hint: "nav.users.hint" as MessageKey,
    ownerOnly: true,
  },
  {
    href: "/settings",
    label: "nav.settings" as MessageKey,
    icon: Settings,
    hint: "nav.settings.hint" as MessageKey,
    ownerOnly: true,
  },
];

export function SidebarNav({ onNavigate, role }: { onNavigate?: () => void; role: string }) {
  const pathname = usePathname();
  const t = useT();
  const visible = navigation.filter((item) => !("ownerOnly" in item && item.ownerOnly) || role === "owner");

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {visible.map(({ href, label, icon: Icon, hint }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            title={t(hint)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {t(label)}
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

export function Sidebar({ role }: { role: string }) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
      <Brand />
      <SidebarNav role={role} />
    </aside>
  );
}

/** The same navigation as a slide-over, for phones and tablets. */
export function MobileSidebar({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: string;
}) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label={t("topbar.closeMenu")}
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30"
      />
      <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border pr-2">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("topbar.closeMenu")}
            className="rounded-lg p-2 text-muted hover:bg-background hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <SidebarNav onNavigate={onClose} role={role} />
      </div>
    </div>
  );
}
