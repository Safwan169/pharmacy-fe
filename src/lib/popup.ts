"use client";

import Swal from "sweetalert2";

/**
 * Popups for the moments a small inline message is easy to miss — a save the
 * shop needs to know went through. Coloured from the app's own tokens.
 */
const base = {
  confirmButtonColor: "var(--primary)",
  cancelButtonColor: "var(--muted, #6b7280)",
  background: "var(--surface, #fff)",
  color: "var(--foreground, #111)",
};

export function popupSuccess(text: string, okLabel: string) {
  return Swal.fire({ ...base, icon: "success", text, confirmButtonText: okLabel, timer: 3000, timerProgressBar: true });
}

export function popupError(text: string, okLabel: string) {
  return Swal.fire({ ...base, icon: "error", text, confirmButtonText: okLabel });
}

/** Resolves true only when the shop presses the confirm button. */
export async function popupConfirm(text: string, confirmLabel: string, cancelLabel: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    icon: "warning",
    text,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    reverseButtons: true,
    focusCancel: true,
  });
  return result.isConfirmed;
}
