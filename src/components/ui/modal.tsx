"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The dark sheet a dialog sits on, and the only place the two awkward parts
 * of a modal are worked out.
 *
 * **Centring** is done with the dialog's own auto margins rather than
 * `items-center`. Centring a flex child that is taller than the screen pushes
 * its top above the scroll area and out of reach; auto margins collapse to
 * nothing in that case and let it scroll from the top instead.
 *
 * **Clicking away** listens for `mousedown` landing on the sheet itself. A
 * plain click would also fire here after a drag that began inside the dialog —
 * selecting an invoice number and releasing outside would close it.
 */
export function ModalShell({
  label,
  onDismiss,
  tint = "bg-foreground/40 backdrop-blur-[1px]",
  children,
}: {
  label: string;
  /** Clicking the sheet does whatever Escape does in this dialog. */
  onDismiss: () => void;
  /** Override only to darken it, as the camera view needs. */
  tint?: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 [&>*]:my-auto",
        tint,
      )}
    >
      {children}
    </div>
  );
}
