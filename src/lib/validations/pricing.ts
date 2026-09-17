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
      message: "v.priceOrStock",
      path: ["price"],
    },
  );

export type PricingInput = z.infer<typeof pricingSchema>;

/** One rung of the unit ladder as the form posts it (already numbers). */
export const unitRowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "v.unitName")
    .max(30, "v.unitNameLong")
    .regex(/^[a-z][a-z0-9 _-]*$/i, "v.unitNameChars"),
  qty_in_base: z
    .number({ message: "v.unitQty" })
    .int("v.unitQtyInteger")
    .min(1, "v.unitQtyMin"),
  price: z
    .number({ message: "v.priceNumbers" })
    .min(0, "v.priceNegative")
    .max(99_999_999.99, "v.priceTooHigh")
    .nullable(),
  is_sellable: z.boolean(),
  is_default: z.boolean(),
});

export const unitsSchema = z
  .array(unitRowSchema)
  .min(1, "v.unitsMin")
  .max(6, "v.unitsMax")
  .refine((rows) => rows.filter((r) => r.is_default).length === 1, { message: "v.unitsOneDefault" })
  .refine((rows) => rows.some((r) => r.qty_in_base === 1), { message: "v.unitsKeepBase" })
  .refine((rows) => new Set(rows.map((r) => r.name.trim().toLowerCase())).size === rows.length, { message: "v.unitsSameName" })
  .refine((rows) => new Set(rows.map((r) => r.qty_in_base)).size === rows.length, { message: "v.unitsSameSize" })
  .refine((rows) => rows.every((r) => !r.is_default || r.is_sellable), { message: "v.unitsDefaultSellable" });

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
      .refine((v) => v === "" || !Number.isNaN(Number(v)), "pos.discountNumbers")
      .refine((v) => v === "" || Number(v) >= 0, "pos.discountNegative"),
  })
  .refine(
    (v) => v.type !== "percentage" || v.value === "" || Number(v.value) <= 100,
    {
      message: "pos.discountOver100",
      path: ["value"],
    },
  );
