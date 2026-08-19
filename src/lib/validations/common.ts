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
  .min(1, "Enter your email address.")
  .email("That doesn't look like an email address. It should look like name@pharmacy.com.");

/**
 * Money typed into a form arrives as a string. Coercion has to reject blanks
 * explicitly — `Number("")` is 0, which would silently price an item at zero.
 */
export const priceSchema = z
  .string()
  .trim()
  .min(1, "Enter a price.")
  .refine((v) => !Number.isNaN(Number(v)), "Enter the price using numbers only, like 40.50.")
  .refine((v) => Number(v) >= 0, "A price can't be negative. Enter 0 or more.")
  .refine(
    (v) => Number(v) <= 99_999_999.99,
    "That price looks too high. Enter an amount below 99,999,999.99.",
  )
  .refine(
    (v) => /^\d*\.?\d{0,2}$/.test(v),
    "Use at most 2 decimal places — for example 40.50, not 40.505.",
  )
  .transform(Number);

/** Whole units on the shelf. `0` is meaningful: confirmed out of stock. */
export const stockSchema = z
  .string()
  .trim()
  .min(1, "Enter a stock quantity.")
  .refine((v) => !Number.isNaN(Number(v)), "Enter the quantity using numbers only.")
  .refine(
    (v) => Number.isInteger(Number(v)),
    "Stock must be a whole number of units — you can't have half a box.",
  )
  .refine(
    (v) => Number(v) >= 0,
    "Stock can't be negative. Enter 0 if the item has run out.",
  )
  .refine((v) => Number(v) <= 1_000_000, "That quantity looks too high to be right.")
  .transform(Number);

export const quantitySchema = z
  .number({ message: "Enter a quantity." })
  .int("Quantity must be a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(10_000, "That quantity looks too high to be right.");

/** Shared by every paginated list screen. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(20),
});
