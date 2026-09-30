import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  inlineAction = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /**
   * Keep the action on the title’s line however narrow the screen is.
   *
   * A wrapping header drops the action to a line of its own rather than
   * letting the text shrink, which costs a whole row on a phone. Pass this
   * where the action is small enough at that width — an icon, say — for the
   * squeezed description to still read.
   */
  inlineAction?: boolean;
}) {
  return (
    <div className={cn("mb-5 flex items-start justify-between gap-3", inlineAction ? "flex-nowrap" : "flex-wrap")}>
      <div className={inlineAction ? "min-w-0" : undefined}>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
