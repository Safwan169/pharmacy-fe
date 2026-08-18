import type { MedicineInput, SupplierInput, SaleInput } from "@/lib/validations";

export interface Medicine extends MedicineInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier extends SupplierInput {
  id: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  medicineCount: number;
}

export interface Sale extends SaleInput {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
}

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
export type ExpiryStatus = "valid" | "expiring-soon" | "expired";
