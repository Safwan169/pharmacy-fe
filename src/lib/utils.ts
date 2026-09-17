import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The backend prices in Bangladeshi Taka. Intl renders BDT as the text "BDT"
 * rather than ৳, so the symbol is applied by hand — the browser has the glyph
 * even though pdfkit's built-in font doesn't (which is why invoices say BDT).
 */
export function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `৳${formatted}`;
}

export function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-BD").format(value);
}

/** The pharmacy runs on an Asia/Dhaka day, exactly like the backend's reports. */
const TIME_ZONE = "Asia/Dhaka";

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

/** Today in Asia/Dhaka as `YYYY-MM-DD`, for date inputs and range defaults. */
export function todayInDhaka(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date(),
  );
}

/**
 * Describes a SKU in one line the way staff say it out loud:
 * "Napa 500 mg — Tablet".
 */
export function describeVariant(variant: {
  product?: { brandName: string };
  dosageForm: string;
  strength: string | null;
}): string {
  const brand = variant.product?.brandName ?? "";
  const strength = variant.strength ? ` ${variant.strength}` : "";
  return `${brand}${strength} — ${variant.dosageForm}`.trim();
}

export function pluralise(unit: string, count: number): string {
  if (count === 1) return unit;
  if (/(s|x|ch|sh)$/i.test(unit)) return `${unit}es`;
  return `${unit}s`;
}
