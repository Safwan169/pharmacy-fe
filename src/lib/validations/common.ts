import { z } from "zod";

/**
 * Every message here is written to be read by a shop assistant, not a
 * developer: it says what went wrong AND what to do, and it names the field in
 * the words used on screen. Nothing says "invalid", "required field" or
 * "must match pattern".
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "v.emailEmpty")
  .email("v.emailInvalid");

/**
 * Money typed into a form arrives as a string. Coercion has to reject blanks
 * explicitly — `Number("")` is 0, which would silently price an item at zero.
 */
export const priceSchema = z
  .string()
  .trim()
  .min(1, "v.priceEmpty")
  .refine((v) => !Number.isNaN(Number(v)), "v.priceNumbers")
  .refine((v) => Number(v) >= 0, "v.priceNegative")
  .refine((v) => Number(v) <= 99_999_999.99, "v.priceTooHigh")
  .refine((v) => /^\d*\.?\d{0,2}$/.test(v), "v.priceDecimals")
  .transform(Number);

/** Whole units on the shelf. `0` is meaningful: confirmed out of stock. */
export const stockSchema = z
  .string()
  .trim()
  .min(1, "v.stockEmpty")
  .refine((v) => !Number.isNaN(Number(v)), "v.stockNumbers")
  .refine((v) => Number.isInteger(Number(v)), "v.stockInteger")
  .refine((v) => Number(v) >= 0, "v.stockNegative")
  .refine((v) => Number(v) <= 1_000_000, "v.stockTooHigh")
  .transform(Number);

export const quantitySchema = z
  .number({ message: "v.qtyEmpty" })
  .int("v.qtyInteger")
  .min(1, "v.qtyMin")
  .max(10_000, "v.stockTooHigh");

/** Shared by every paginated list screen. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});
