"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, ScanLine, X } from "lucide-react";
import { forgetBarcode } from "@/lib/actions/pricing";
import { typeBarcode, type TypedCodeState } from "@/lib/actions/search";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VariantBarcode } from "@/types";
import { useT } from "@/i18n/client";

const initial: TypedCodeState = { status: "idle" };

/**
 * The codes that open this medicine.
 *
 * They normally arrive by being scanned at the counter, which costs nobody
 * anything — but a shop whose scanner has died, or whose only phone is an
 * iPhone, can otherwise never pair a single one. Typing the digits printed
 * under the bars is slow and worth avoiding, and it is the only way in when
 * there is nothing to scan with.
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
  const [state, add, adding] = useActionState(typeBarcode, initial);
  const shown = barcodes.filter((b) => !gone.includes(b.id));

  return (
    <div className="space-y-3">
      {shown.length === 0 ? (
        <p className="text-sm text-muted">{t("scan.noCodes")}</p>
      ) : (
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
      )}

      {canEdit && (
        <form action={add} className="space-y-2 border-t border-border pt-3">
          <input type="hidden" name="variant_id" value={variantId} />
          <div className="flex gap-2">
            <Input
              name="code"
              // The digits under the bars, so a numeric keypad on a phone.
              inputMode="numeric"
              autoComplete="off"
              maxLength={32}
              placeholder={t("scan.codePlaceholder")}
              className="font-mono"
              aria-label={t("scan.addByHand")}
              key={state.status === "success" ? "cleared" : "typing"}
            />
            <Button type="submit" variant="secondary" disabled={adding} className="shrink-0">
              <Plus className="h-4 w-4" aria-hidden />
              {t("scan.addCode")}
            </Button>
          </div>
          <p className="text-xs text-muted">{t("scan.typeHint")}</p>
          {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
          {state.status === "success" && state.message && <Alert tone="success">{state.message}</Alert>}
        </form>
      )}
    </div>
  );
}
