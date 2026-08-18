import { z } from "zod";
import { moneySchema, quantitySchema } from "./common";

export const DOSAGE_FORMS = [
  "tablet",
  "capsule",
  "syrup",
  "injection",
  "ointment",
  "drops",
  "inhaler",
  "other",
] as const;

export const medicineSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    genericName: z.string().trim().max(120).optional().or(z.literal("")),
    brand: z.string().trim().max(120).optional().or(z.literal("")),
    categoryId: z.string().min(1, "Select a category"),
    supplierId: z.string().min(1, "Select a supplier"),
    dosageForm: z.enum(DOSAGE_FORMS, { message: "Select a dosage form" }),
    strength: z.string().trim().max(50).optional().or(z.literal("")),
    barcode: z
      .string()
      .trim()
      .regex(/^[0-9]{8,14}$/, "Barcode must be 8-14 digits")
      .optional()
      .or(z.literal("")),
    batchNumber: z.string().trim().min(1, "Batch number is required").max(50),
    costPrice: moneySchema,
    sellingPrice: moneySchema,
    quantity: quantitySchema,
    reorderLevel: quantitySchema,
    manufactureDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date({ message: "Expiry date is required" }),
    prescriptionRequired: z.boolean().default(false),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.sellingPrice >= data.costPrice, {
    message: "Selling price cannot be lower than cost price",
    path: ["sellingPrice"],
  })
  .refine(
    (data) => !data.manufactureDate || data.expiryDate > data.manufactureDate,
    {
      message: "Expiry date must be after the manufacture date",
      path: ["expiryDate"],
    },
  );

/** Raw form state — numbers and dates still arrive as strings from inputs. */
export type MedicineFormValues = z.input<typeof medicineSchema>;
/** Parsed and coerced payload. */
export type MedicineInput = z.output<typeof medicineSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
