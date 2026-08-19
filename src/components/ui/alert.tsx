import type { ReactNode } from "react";
import { CircleCheck, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "warning" | "info";

const styles: Record<Tone, { wrapper: string; icon: typeof Info }> = {
  success: {
    wrapper: "border-success/30 bg-success/5 text-success",
    icon: CircleCheck,
  },
  error: {
    wrapper: "border-danger/30 bg-danger/5 text-danger",
    icon: CircleAlert,
  },
  warning: {
    wrapper: "border-warning/30 bg-warning/5 text-warning",
    icon: TriangleAlert,
  },
  info: { wrapper: "border-primary/30 bg-primary/5 text-primary", icon: Info },
};

/**
 * Feedback the user must not miss. `role` is chosen by tone: errors interrupt
 * a screen reader, confirmations wait their turn.
 */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { wrapper, icon: Icon } = styles[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", wrapper, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && (
          <div className={cn("text-foreground/80", title && "mt-1")}>{children}</div>
        )}
      </div>
    </div>
  );
}
