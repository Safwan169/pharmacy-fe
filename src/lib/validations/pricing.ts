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

/** One rung of the unit ladder as the form posts it (already numbers). */
export const unitRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give this unit a name, like strip or box.")
    .max(30, "Keep the unit name under 30 letters.")
    .regex(/^[a-z][a-z0-9 _-]*$/i, "Unit names can only use letters, numbers, spaces and dashes."),
  qty_in_base: z
    .number({ message: "Enter how many are in one of these." })
    .int("Use a whole number.")
    .min(1, "At least 1."),
  price: z
    .number({ message: "Enter a price using numbers only." })
    .min(0, "A price can't be negative.")
    .max(99_999_999.99, "That price looks too high.")
    .nullable(),
  is_sellable: z.boolean(),
  is_default: z.boolean(),
});

export const unitsSchema = z
  .array(unitRowSchema)
  .min(1, "Add at least one unit.")
  .max(6, "Six units is the most a medicine can have.")
  .refine((rows) => rows.filter((r) => r.is_default).length === 1, {
    message: "Pick exactly one unit as the one the counter shows first.",
  })
  .refine((rows) => rows.some((r) => r.qty_in_base === 1), {
    message: "Keep the single-unit row (quantity 1), even if you don't sell singles.",
  })
  .refine((rows) => new Set(rows.map((r) => r.name.trim().toLowerCase())).size === rows.length, {
    message: "Two units have the same name. Rename one of them.",
  })
  .refine((rows) => new Set(rows.map((r) => r.qty_in_base)).size === rows.length, {
    message: "Two units have the same size. Change one of them.",
  })
  .refine((rows) => rows.every((r) => !r.is_default || r.is_sellable), {
    message: "The unit the counter shows first must be sellable.",
  });

export type UnitRowInput = z.infer<typeof unitRowSchema>;

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
