"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { todayInDhaka } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { SALE_STATUS_KEYS } from "@/i18n";
import { SALE_STATUSES } from "@/types";

/**
 * Invoice search plus a date range.
 *
 * The range is validated here rather than left to the API, because "start
 * after end" comes back as a 400 that says nothing useful to a shop assistant.
 */
export function SalesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const t = useT();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const urlSearch = searchParams.get("search") ?? "";

  // See VariantFilters: `typed` holds keystrokes until the debounce fires, and
  // resets during render whenever the URL changes from elsewhere.
  const [typed, setTyped] = useState<string | null>(null);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch);
    setTyped(null);
  }

  const search = typed ?? urlSearch;

  useEffect(() => {
    if (typed === null || typed === urlSearch) return;

    const timer = setTimeout(() => apply({ search: typed }), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, urlSearch]);

  function apply(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const rangeError =
    from && to && from > to
      ? t("sales.rangeError")
      : undefined;

  const hasFilters = Boolean(search || from || to || searchParams.get("status"));
  const today = todayInDhaka();

  return (
    <div className="mb-4 space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={t("sales.searchPlaceholder")}
          aria-label={t("sales.searchLabel")}
          className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
        />
        {pending && (
          <Loader2
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
            aria-label={t("filters.searching")}
          />
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <DateField
          id="from"
          label={t("common.from")}
          value={from}
          max={today}
          onChange={(value) => apply({ from: value })}
        />
        <DateField
          id="to"
          label={t("common.toDate")}
          value={to}
          max={today}
          onChange={(value) => apply({ to: value })}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-xs font-medium text-muted">
            {t("th.status")}
          </label>
          <select
            id="status"
            value={searchParams.get("status") ?? ""}
            onChange={(e) => apply({ status: e.target.value })}
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
          >
            <option value="">{t("common.all")}</option>
            {SALE_STATUSES.map((status) => (
              <option key={status} value={status}>{t(SALE_STATUS_KEYS[status])}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              startTransition(() => router.replace(pathname, { scroll: false }))
            }
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("filters.clear")}
          </button>
        )}
      </div>

      {rangeError && <p className="text-xs text-danger">{rangeError}</p>}
    </div>
  );
}

function DateField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  max: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:border-primary focus:outline-2 focus:outline-primary/30"
      />
    </div>
  );
}
