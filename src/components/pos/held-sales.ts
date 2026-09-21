import type { DiscountType } from "@/types";

/**
 * A basket set aside while another customer is served. Kept in this
 * browser's localStorage: one counter, one device, and a parked basket that
 * outlives a reload is all that's needed.
 */
export interface HeldSale {
  id: string;
  label: string;
  heldAt: string;
  lines: HeldLine[];
  discountType: DiscountType;
  discountValue: string;
}

export interface HeldLine {
  variantId: number;
  name: string;
  dosageForm: string;
  unitId: number;
  unitName: string;
  qtyInBase: number;
  unitPrice: number;
  stockAtAdd: number;
  quantity: number;
}

const KEY = "pharmacy.heldSales";

/** Stamps a parked basket with an id and the time it was set aside. */
export function newHeldSale(label: string, lines: HeldLine[], discountType: DiscountType, discountValue: string): HeldSale {
  return { id: `${Date.now()}`, label, heldAt: new Date().toISOString(), lines, discountType, discountValue };
}

export function loadHeldSales(): HeldSale[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as HeldSale[]) : [];
  } catch {
    return [];
  }
}

export function saveHeldSales(list: HeldSale[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or storage full — the hold simply doesn't survive a reload.
  }
}
