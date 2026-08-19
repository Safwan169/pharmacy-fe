import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Page links that keep every current filter. Rendered as anchors rather than
 * buttons so they work without JavaScript and can be opened in a new tab.
 */
export function Pagination({
  meta,
  basePath,
  params,
}: {
  meta: PaginationMeta;
  basePath: string;
  /** The current query string, minus `page`. */
  params: Record<string, string | undefined>;
}) {
  if (meta.totalPages <= 1) return null;

  const href = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (page > 1) search.set("page", String(page));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const first = (meta.page - 1) * meta.limit + 1;
  const last = Math.min(meta.page * meta.limit, meta.total);

  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3"
    >
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-foreground">{first.toLocaleString()}</span>
        {"–"}
        <span className="font-medium text-foreground">{last.toLocaleString()}</span> of{" "}
        <span className="font-medium text-foreground">{meta.total.toLocaleString()}</span>
      </p>

      <div className="flex items-center gap-1">
        <PageLink
          href={href(meta.page - 1)}
          disabled={meta.page <= 1}
          label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </PageLink>

        <span className="px-2 text-xs text-muted">
          Page {meta.page.toLocaleString()} of {meta.totalPages.toLocaleString()}
        </span>

        <PageLink
          href={href(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
          label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex h-8 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium transition-colors",
    disabled
      ? "cursor-not-allowed text-muted/50"
      : "text-foreground hover:bg-background",
  );

  if (disabled) {
    return (
      <span aria-disabled className={className}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
