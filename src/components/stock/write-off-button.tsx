"use client";

import { useActionState } from "react";
import { writeOffBatch, type WriteOffState } from "@/lib/actions/pricing";

const initialState: WriteOffState = { status: "idle" };

/** One-click write-off for an expired batch, inline in a table row. */
export function WriteOffButton({ batchId, variantId }: { batchId: number; variantId: number }) {
  const [state, formAction, pending] = useActionState(writeOffBatch, initialState);

  if (state.status === "success") {
    return <span className="text-xs text-success">Written off</span>;
  }

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="batch_id" value={batchId} />
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="note" value="Expired on shelf" />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
      >
        {pending ? "Writing off…" : "Write off"}
      </button>
      {state.status === "error" && state.message && (
        <p className="mt-1 text-xs text-danger">{state.message}</p>
      )}
    </form>
  );
}
