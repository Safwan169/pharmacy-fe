import { z } from "zod";
import { moneySchema, quantitySchema } from "./common";

export const PAYMENT_METHODS = ["cash", "card", "insurance", "mobile"] as const;

export const saleItemSchema = z.object({
  medicineId: z.string().min(1, "Select a medicine"),
  quantity: quantitySchema.refine((n) => n > 0, "Quantity must be at least 1"),
  unitPrice: moneySchema,
  discount: moneySchema.default(0),
});

export const saleSchema = z
  .object({
    customerName: z.string().trim().max(120).optional().or(z.literal("")),
    customerPhone: z.string().trim().max(20).optional().or(z.literal("")),
    /** Required once any line item is prescription-only. */
    prescriptionRef: z.string().trim().max(60).optional().or(z.literal("")),
    paymentMethod: z.enum(PAYMENT_METHODS, { message: "Select a payment method" }),
    items: z.array(saleItemSchema).min(1, "Add at least one item"),
    taxRate: z.coerce.number().min(0).max(100).default(0),
  })
  .refine(
    (sale) =>
      sale.items.every((item) => item.discount <= item.unitPrice * item.quantity),
    { message: "Discount cannot exceed the line total", path: ["items"] },
  );

export type SaleFormValues = z.input<typeof saleSchema>;
export type SaleInput = z.output<typeof saleSchema>;
export type SaleItemInput = z.output<typeof saleItemSchema>;

export function calculateSaleTotals(sale: Pick<SaleInput, "items" | "taxRate">) {
  const subtotal = sale.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity - item.discount,
    0,
  );
  const tax = (subtotal * sale.taxRate) / 100;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round((subtotal + tax) * 100) / 100,
  };
}
