import { z } from "zod";
import { priceSchema, stockSchema } from "./common";

/**
 * Price and stock are independent on the API: a restock sends stock alone, a
 * re-price sends price alone. Both fields are therefore optional, with a blank
 * string meaning "leave this as it is" rather than "set it to zero".
 *
 * The one rule the API enforces server-side — at least one of the two must be
 * present — is repeated here so the person gets told before the round trip.
 */
export const pricingSchema = z
  .object({
    price: z.union([z.literal(""), priceSchema]).optional(),
    stock_quantity: z.union([z.literal(""), stockSchema]).optional(),
  })
  .refine(
    (v) => v.price !== "" || v.stock_quantity !== "",
    {
      message: "Enter a price or a stock quantity — otherwise there's nothing to save.",
      path: ["price"],
    },
  );

export type PricingInput = z.infer<typeof pricingSchema>;

export const DISCOUNT_TYPE_LABELS = {
  percentage: "Percentage (%)",
  flat: "Fixed amount",
} as const;

/**
 * Checkout discount. A percentage above 100 would make the total negative, so
 * it's capped here with an explanation rather than silently clamped.
 */
export const discountSchema = z
  .object({
    type: z.enum(["flat", "percentage"]),
    value: z
      .string()
      .trim()
      .refine((v) => v === "" || !Number.isNaN(Number(v)), "Enter the discount using numbers only.")
      .refine((v) => v === "" || Number(v) >= 0, "A discount can't be negative."),
  })
  .refine(
    (v) => v.type !== "percentage" || v.value === "" || Number(v.value) <= 100,
    {
      message: "A percentage discount can't be more than 100%.",
      path: ["value"],
    },
  );
