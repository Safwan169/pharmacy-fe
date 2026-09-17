"use client";

import { useActionState } from "react";
import { writeOffBatch, type WriteOffState } from "@/lib/actions/pricing";
import { Table, Th, Td } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { StockBatch } from "@/types";
import { pluralise } from "./status-badges";

const initialState: WriteOffState = { status: "idle" };

/** Days from today to a `YYYY-MM-DD` date, using the browser's clock. */
function daysUntil(date: string): number {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (expiryDate === null) return <Badge tone="neutral">No date</Badge>;
  const days = daysUntil(expiryDate);
  if (days < 0) return <Badge tone="danger">Expired</Badge>;
  if (days <= 30) return <Badge tone="danger">{days === 0 ? "Expires today" : `${days} days left`}</Badge>;
  if (days <= 90) return <Badge tone="warning">{days} days left</Badge>;
  return <Badge tone="success">OK</Badge>;
}

/**
 * The lots this SKU's stock sits in. Checkout sells from the one expiring
 * soonest, so the order here is the order the shelf empties in.
 */
export function BatchTable({
  variantId,
  baseUnit,
  batches,
  canWriteOff = true,
}: {
  variantId: number;
  baseUnit: string;
  batches: StockBatch[];
  canWriteOff?: boolean;
}) {
  const [state, formAction, pending] = useActionState(writeOffBatch, initialState);

  if (batches.length === 0) {
    return (
      <p className="p-5 text-sm text-muted">
        No batches yet. Stock received with a batch number and expiry date will appear here.
      </p>
    );
  }

  return (
    <div>
      {state.status === "success" && state.message && (
        <div className="px-5 pt-4">
          <Alert tone="success">{state.message}</Alert>
        </div>
      )}
      {state.status === "error" && state.message && (
        <div className="px-5 pt-4">
          <Alert tone="error">{state.message}</Alert>
        </div>
      )}
      <Table>
        <thead>
          <tr>
            <Th>Batch</Th>
            <Th>Expiry</Th>
            <Th className="text-right">Left</Th>
            <Th className="hidden text-right sm:table-cell">Cost each</Th>
            <Th className="text-right">Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => {
            const expired = batch.expiryDate !== null && daysUntil(batch.expiryDate) < 0;
            return (
              <tr key={batch.id} className={batch.quantity === 0 ? "opacity-60" : undefined}>
                <Td className="font-mono text-xs">{batch.batchNo ?? "—"}</Td>
                <Td>{batch.expiryDate ? formatDate(batch.expiryDate) : "Not recorded"}</Td>
                <Td className="text-right tabular-nums">
                  {batch.quantity.toLocaleString()}{" "}
                  <span className="text-xs text-muted">{pluralise(baseUnit, batch.quantity)}</span>
                </Td>
                <Td className="hidden text-right tabular-nums text-muted sm:table-cell">
                  {batch.costPrice === null ? "—" : formatCurrency(batch.costPrice)}
                </Td>
                <Td className="text-right">
                  {batch.quantity === 0 ? (
                    <Badge tone="neutral">Empty</Badge>
                  ) : (
                    <ExpiryBadge expiryDate={batch.expiryDate} />
                  )}
                </Td>
                <Td className="text-right">
                  {canWriteOff && expired && batch.quantity > 0 && (
                    <form action={formAction}>
                      <input type="hidden" name="batch_id" value={batch.id} />
                      <input type="hidden" name="variant_id" value={variantId} />
                      <input type="hidden" name="note" value="Expired on shelf" />
                      <button
                        type="submit"
                        disabled={pending}
                        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        Write off
                      </button>
                    </form>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
