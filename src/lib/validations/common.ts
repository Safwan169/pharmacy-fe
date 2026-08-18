import { z } from "zod";

export const idSchema = z.string().min(1, "Required");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .regex(/^[+0-9\s()-]{7,20}$/, "Enter a valid phone number");

/**
 * Money is entered in forms as text, so coerce and then guard against the
 * float artefacts that show up once you multiply a price by a quantity.
 */
export const moneySchema = z
  .coerce.number({ message: "Enter a valid amount" })
  .nonnegative("Amount cannot be negative")
  .max(1_000_000, "Amount is too large")
  .refine((n) => Number.isFinite(n), "Enter a valid amount")
  .refine(
    (n) => Math.round(n * 100) === Number((n * 100).toFixed(0)),
    "Use at most 2 decimal places",
  );

export const quantitySchema = z.coerce
  .number({ message: "Enter a valid quantity" })
  .int("Quantity must be a whole number")
  .nonnegative("Quantity cannot be negative");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;
