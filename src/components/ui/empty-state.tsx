import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shown instead of a blank table. Always says why it's empty and what to do
 * next — "No results" on its own leaves people stuck.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-border/50 text-muted">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
