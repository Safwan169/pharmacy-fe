import type { Medicine, ExpiryStatus, StockStatus } from "@/types";
import { daysUntil } from "./utils";

/** Stock within this many units above the reorder level still counts as low. */
export const EXPIRY_WARNING_DAYS = 90;

export function getStockStatus(medicine: Medicine): StockStatus {
  if (medicine.quantity <= 0) return "out-of-stock";
  if (medicine.quantity <= medicine.reorderLevel) return "low-stock";
  return "in-stock";
}

export function getExpiryStatus(medicine: Medicine): ExpiryStatus {
  const days = daysUntil(medicine.expiryDate);
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring-soon";
  return "valid";
}

export const stockLabels: Record<StockStatus, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

export const expiryLabels: Record<ExpiryStatus, string> = {
  valid: "Valid",
  "expiring-soon": "Expiring soon",
  expired: "Expired",
};

export const stockTones = {
  "in-stock": "success",
  "low-stock": "warning",
  "out-of-stock": "danger",
} as const;

export const expiryTones = {
  valid: "neutral",
  "expiring-soon": "warning",
  expired: "danger",
} as const;

export function getInventoryValue(items: Medicine[]) {
  return items.reduce((sum, m) => sum + m.costPrice * m.quantity, 0);
}
