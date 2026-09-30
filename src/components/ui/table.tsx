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
        // Narrower gutters on a phone: two columns' worth of padding is
        // most of the width a medicine's name needs to stay on one line.
        "border-b border-border px-3 py-3 text-left text-xs font-semibold sm:px-5",
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
      className={cn("border-b border-border px-3 py-3 align-middle sm:px-5", className)}
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
