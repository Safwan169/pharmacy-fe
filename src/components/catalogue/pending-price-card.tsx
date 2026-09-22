"use client";

import { useActionState } from "react";
import { Clock } from "lucide-react";
import { resolvePending } from "@/lib/actions/pricing";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/i18n/client";
import type { PendingPrice } from "@/types";

/**
 * "New price once the old packs are gone" — set at delivery. Shows what is
 * waiting and how much old stock stands in the way; the owner can jump the
 * queue or drop it.
 */
export function PendingPriceCard({ pending, baseUnit }: { pending: PendingPrice; baseUnit: string }) {
  const [state, action, busy] = useActionState(resolvePending, { status: "idle" as const });
  const t = useT();
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;

  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Clock className="h-4 w-4 text-warning" aria-hidden />
        {t("pending.title")}
      </p>
      <p className="mt-1 text-sm text-foreground/80">
        {t("pending.body", { count: pending.oldStockLeft ?? 0, unit: baseUnit })}
      </p>
      <ul className="mt-2 space-y-0.5 text-sm tabular-nums">
        {pending.unitPrices.map((u) => (
          <li key={u.unit_id} className="flex justify-between">
            <span className="text-muted">{u.unit_name}</span>
            <span className="font-medium">{formatCurrency(u.price)}</span>
          </li>
        ))}
      </ul>
      {state.status === "error" && state.message && <Alert tone="error" className="mt-3">{state.message}</Alert>}
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="variant_id" value={pending.variantId} />
          <input type="hidden" name="intent" value="apply" />
          <Button type="submit" size="sm" disabled={busy}>{t("pending.applyNow")}</Button>
        </form>
        <form action={action}>
          <input type="hidden" name="variant_id" value={pending.variantId} />
          <input type="hidden" name="intent" value="cancel" />
          <Button type="submit" size="sm" variant="secondary" disabled={busy}>{t("pending.cancel")}</Button>
        </form>
      </div>
    </div>
  );
}
