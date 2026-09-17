"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X, Loader2 } from "lucide-react";
import type { Generic, Manufacturer } from "@/types";
import { useT } from "@/i18n/client";

interface Props {
  manufacturers: Manufacturer[];
  generics: Generic[];
  /** The pricing worklist fixes this filter itself, so it hides the control. */
  showPricingStatus?: boolean;
  showAvailability?: boolean;
}

/**
 * Filters that write straight to the URL, so the server can render the
 * filtered page and a filtered view stays shareable and refresh-proof.
 *
 * Typing is debounced — a keystroke-per-request against a 21,000-row catalogue
 * would queue up work nobody is waiting for any more.
 */
export function VariantFilters({
  manufacturers,
  generics,
  showPricingStatus = true,
  showAvailability = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const t = useT();

  const urlSearch = searchParams.get("search") ?? "";

  // What's typed, tracked separately from the URL so the box stays responsive
  // while the debounce waits. `null` means "nothing typed since the URL last
  // changed", so the URL is the source of truth — adjusting during render
  // rather than in an effect avoids a second render pass.
  const [typed, setTyped] = useState<string | null>(null);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);

  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch);
    setTyped(null);
  }

  const search = typed ?? urlSearch;

  useEffect(() => {
    if (typed === null || typed === urlSearch) return;

    const timer = setTimeout(() => apply("search", typed), 350);
    return () => clearTimeout(timer);
    // `apply` is recreated each render; listing it would restart the debounce
    // on every keystroke's re-render and it would never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, urlSearch]);

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    // Any filter change invalidates the current page number.
    params.delete("page");

    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  const activeCount = ["manufacturer_id", "generic_id", "type", "pricing_status", "status"]
    .filter((key) => searchParams.get(key))
    .length + (searchParams.get("search") ? 1 : 0);

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
          placeholder={t("catalogue.searchPlaceholder")}
          aria-label={t("catalogue.searchLabel")}
          className="h-11 w-full rounded-lg border border-border bg-surface pr-10 pl-9 text-sm placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-primary/30"
        />
        {pending && (
          <Loader2
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted"
            aria-label={t("filters.searching")}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label={t("th.company")}
          value={searchParams.get("manufacturer_id") ?? ""}
          onChange={(v) => apply("manufacturer_id", v)}
          options={manufacturers.map((m) => ({ value: String(m.id), label: m.name }))}
          allLabel={t("filters.allCompanies")}
        />

        <FilterSelect
          label={t("th.ingredient")}
          value={searchParams.get("generic_id") ?? ""}
          onChange={(v) => apply("generic_id", v)}
          options={generics.map((g) => ({ value: String(g.id), label: g.name }))}
          allLabel={t("filters.allIngredients")}
        />

        <FilterSelect
          label={t("filters.kind")}
          value={searchParams.get("type") ?? ""}
          onChange={(v) => apply("type", v)}
          options={[
            { value: "allopathic", label: t("kind.allopathic") },
            { value: "herbal", label: t("kind.herbal") },
          ]}
          allLabel={t("filters.allKinds")}
        />

        {showPricingStatus && (
          <FilterSelect
            label={t("filters.pricing")}
            value={searchParams.get("pricing_status") ?? ""}
            onChange={(v) => apply("pricing_status", v)}
            options={[
              { value: "missing", label: t("filters.needsPrice") },
              { value: "set", label: t("filters.priced") },
            ]}
            allLabel={t("filters.pricedOrNot")}
          />
        )}

        {showAvailability && (
          <FilterSelect
            label={t("filters.availability")}
            value={searchParams.get("status") ?? ""}
            onChange={(v) => apply("status", v)}
            options={[
              { value: "active", label: t("badge.onSale") },
              { value: "inactive", label: t("filters.withdrawn") },
              { value: "all", label: t("filters.both") },
            ]}
            allLabel={t("badge.onSale")}
          />
        )}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {activeCount === 1 ? t("filters.clearOne") : t("filters.clearAll", { count: activeCount })}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 max-w-52 cursor-pointer rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:border-primary focus:outline-2 focus:outline-primary/30"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
