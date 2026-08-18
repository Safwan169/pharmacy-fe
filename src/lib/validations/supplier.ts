import { z } from "zod";
import { emailSchema, phoneSchema } from "./common";

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  contactPerson: z.string().trim().max(120).optional().or(z.literal("")),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().trim().max(300).optional().or(z.literal("")),
  licenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type SupplierFormValues = z.input<typeof supplierSchema>;
export type SupplierInput = z.output<typeof supplierSchema>;
