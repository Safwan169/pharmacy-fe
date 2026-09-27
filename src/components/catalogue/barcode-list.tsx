"use client";

import { useState, useTransition } from "react";
import { ScanLine, X } from "lucide-react";
import { forgetBarcode } from "@/lib/actions/pricing";
import type { VariantBarcode } from "@/types";
import { useT } from "@/i18n/client";

/**
 * The codes that open this medicine. Read-only in practice — they arrive by
 * being scanned at the counter — but a code paired to the wrong pack has to be
 * removable, or the mistake sells the wrong medicine for good.
 */
export function BarcodeList({
  variantId,
  barcodes,
  canEdit,
}: {
  variantId: number;
  barcodes: VariantBarcode[];
  canEdit: boolean;
}) {
  const t = useT();
  const [gone, setGone] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const shown = barcodes.filter((b) => !gone.includes(b.id));

  if (shown.length === 0) {
    return <p className="text-sm text-muted">{t("scan.noCodes")}</p>;
  }

  return (
    <ul className="space-y-1.5">
      {shown.map((barcode) => (
        <li key={barcode.id} className="flex items-center gap-2 text-sm">
          <ScanLine className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span className="font-mono">{barcode.code}</span>
          {barcode.note && <span className="truncate text-xs text-muted">{barcode.note}</span>}
          {canEdit && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await forgetBarcode(variantId, barcode.id);
                  setGone((ids) => [...ids, barcode.id]);
                })
              }
              className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-background hover:text-danger"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("scan.forget")}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
