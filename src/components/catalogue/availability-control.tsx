"use client";

import { useActionState, useState } from "react";
import { setVariantAvailability } from "@/lib/actions/pricing";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useT } from "@/i18n/client";

/**
 * Withdraw a SKU from sale, or put it back.
 *
 * Withdrawing is reversible and never loses data, but it does make an item
 * disappear from search and the counter — so it asks first, and says exactly
 * what will and won't happen.
 */
export function AvailabilityControl({
  variantId,
  isActive,
  name,
}: {
  variantId: number;
  isActive: boolean;
  name: string;
}) {
  const [state, formAction, pending] = useActionState(setVariantAvailability, {
    status: "idle" as const,
  });
  const [confirming, setConfirming] = useState(false);
  const t = useT();

  return (
    <div className="space-y-3">
      {state.status === "success" && state.message && (
        <Alert tone="success">{state.message}</Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert tone="error">{state.message}</Alert>
      )}

      {isActive ? (
        confirming ? (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">
              {t("availability.confirmTitle", { name })}
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              {t("availability.confirmBody")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={formAction}>
                <input type="hidden" name="variant_id" value={variantId} />
                <input type="hidden" name="intent" value="withdraw" />
                <Button type="submit" variant="danger" size="sm" disabled={pending}>
                  {pending ? t("availability.withdrawing") : t("availability.yesWithdraw")}
                </Button>
              </form>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                {t("availability.keep")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(true)}
          >
            {t("availability.withdraw")}
          </Button>
        )
      ) : (
        <form action={formAction}>
          <input type="hidden" name="variant_id" value={variantId} />
          <input type="hidden" name="intent" value="restore" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? t("availability.restoring") : t("availability.restore")}
          </Button>
        </form>
      )}
    </div>
  );
}
