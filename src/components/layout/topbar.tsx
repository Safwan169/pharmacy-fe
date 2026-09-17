"use client";

import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { useT } from "@/i18n/client";
import { MobileSidebar } from "./sidebar";
import { ChangePassword } from "./change-password";
import { LanguageSwitch } from "./language-switch";
import type { UserProfile } from "@/types";

export function Topbar({ user }: { user: UserProfile | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useT();

  const display = user?.name?.trim() || user?.email || t("topbar.signedIn");
  const initials = display.slice(0, 2).toUpperCase();
  const roleLabel = user?.role === "owner" ? t("role.owner") : user?.role === "cashier" ? t("role.cashier") : (user?.role ?? "");

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-5">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t("topbar.openMenu")}
          className="rounded-lg p-2 text-muted transition-colors hover:bg-background hover:text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitch />

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </span>
            <div className="hidden sm:block">
              <p className="text-xs font-medium">{display}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>
          </div>

          <ChangePassword />

          <form action={logout} className="border-l border-border pl-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">{t("topbar.signOut")}</span>
            </button>
          </form>
        </div>
      </header>

      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} role={user?.role ?? "cashier"} />
    </>
  );
}
