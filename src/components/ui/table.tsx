import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Wrapper keeps wide tables scrolling inside the card instead of the page. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-border px-5 py-3 text-left text-xs font-semibold",
        "tracking-wide text-muted uppercase whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-border px-5 py-3 align-middle", className)}
      {...props}
    />
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-sm text-muted">
        {message}
      </td>
    </tr>
  );
}
