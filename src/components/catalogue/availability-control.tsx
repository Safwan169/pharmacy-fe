"use client";

import { useActionState, useState } from "react";
import { setVariantAvailability } from "@/lib/actions/pricing";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
              Withdraw {name} from sale?
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              It will disappear from search and can&apos;t be sold at the counter.
              Its price, stock count and past sales are all kept, and you can put
              it back at any time.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={formAction}>
                <input type="hidden" name="variant_id" value={variantId} />
                <input type="hidden" name="intent" value="withdraw" />
                <Button type="submit" variant="danger" size="sm" disabled={pending}>
                  {pending ? "Withdrawing…" : "Yes, withdraw it"}
                </Button>
              </form>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                Keep it on sale
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
            Withdraw from sale
          </Button>
        )
      ) : (
        <form action={formAction}>
          <input type="hidden" name="variant_id" value={variantId} />
          <input type="hidden" name="intent" value="restore" />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Putting back…" : "Put back on sale"}
          </Button>
        </form>
      )}
    </div>
  );
}
