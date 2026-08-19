"use client";

import { useActionState } from "react";
import { updatePricing, type PricingState } from "@/lib/actions/pricing";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";

// A "use server" file may only export async functions, so the starting state
// lives here rather than beside the action.
const initialState: PricingState = { status: "idle" };

/**
 * Price and stock are independent on the API, so each field can be left blank
 * to mean "don't change this". The hints say so in plain words, because an
 * empty box normally reads as "erase it".
 */
export function PricingForm({
  variantId,
  price,
  stock,
}: {
  variantId: number;
  price: number | null;
  stock: number | null;
}) {
  const [state, formAction, pending] = useActionState(
    updatePricing,
    initialState,
  );

  const neverPriced = price === null;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="variant_id" value={variantId} />

      {state.status === "success" && state.message && (
        <Alert tone="success">{state.message}</Alert>
      )}
      {state.status === "error" && state.message && (
        <Alert tone="error">{state.message}</Alert>
      )}

      <Field
        label="Selling price"
        htmlFor="price"
        error={state.errors?.price}
        hint={
          neverPriced
            ? "This medicine has never been priced, so it can't be sold yet."
            : `Currently ${formatCurrency(price)}. Leave blank to keep it.`
        }
      >
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
            ৳
          </span>
          <Input
            id="price"
            name="price"
            type="text"
            inputMode="decimal"
            placeholder={neverPriced ? "0.00" : String(price)}
            className="pl-7"
            autoComplete="off"
            invalid={!!state.errors?.price}
          />
        </div>
      </Field>

      <Field
        label="Units in stock"
        htmlFor="stock_quantity"
        error={state.errors?.stock_quantity}
        hint={
          stock === null
            ? "Nobody has counted this yet. Enter 0 if there are none on the shelf."
            : `Currently ${stock.toLocaleString()} on the shelf. Leave blank to keep it.`
        }
      >
        <Input
          id="stock_quantity"
          name="stock_quantity"
          type="text"
          inputMode="numeric"
          placeholder={stock === null ? "0" : String(stock)}
          autoComplete="off"
          invalid={!!state.errors?.stock_quantity}
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>

      <p className="text-xs text-muted">
        You can fill in just one of the two. Restocking doesn&apos;t require
        re-entering the price.
      </p>
    </form>
  );
}
