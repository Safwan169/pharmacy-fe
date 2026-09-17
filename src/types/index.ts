/**
 * Mirrors the NestJS API's response shapes.
 *
 * The backend serialises entities with camelCase property names (TypeORM
 * entities) but takes and returns snake_case on DTOs — query params, the
 * pricing body, checkout and the dashboard. Both spellings appear below on
 * purpose; each matches the side of the wire it belongs to.
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export const PRODUCT_TYPES = ["allopathic", "herbal"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface Manufacturer {
  id: number;
  name: string;
}

export interface Generic {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  brandName: string;
  manufacturerId: number;
  manufacturer: Manufacturer;
  type: ProductType;
  /** Present on list responses only. Counts active SKUs. */
  variantCount?: number;
  /** Present on `GET /products/:id` only. */
  variants?: ProductVariant[];
}

/**
 * The sellable SKU.
 *
 * `price` and `stockQuantity` are `null` until an admin sets them — which is
 * NOT the same as zero. `null` means "nobody has entered this yet"; `0` means
 * "confirmed out of stock". Every screen has to keep that distinction visible.
 */
export interface ProductVariant {
  id: number;
  productId: number;
  product: Product;
  genericId: number | null;
  generic: Generic | null;
  dosageForm: string;
  strength: string | null;
  slug: string | null;
  /** Price of the default sellable unit. Null until an admin sets units. */
  price: number | null;
  /** Count in `baseUnit`. */
  stockQuantity: number | null;
  priceUpdatedAt: string | null;
  isActive: boolean;
  /** The smallest thing counted — tablet, bottle, vial… */
  baseUnit: string;
  packSize: number | null;
  /** Sellable-unit ladder, in display order. Empty until set up. */
  units: VariantUnit[];
}

/** "strip of 10 at ৳12". `qtyInBase` is what one of these takes off stock. */
export interface VariantUnit {
  id: number;
  variantId: number;
  name: string;
  qtyInBase: number;
  price: number | null;
  isSellable: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface UnitTemplateRow {
  name: string;
  qty_in_base: number;
  is_sellable: boolean;
  is_default: boolean;
}

export interface UnitTemplate {
  base_unit: string;
  units: UnitTemplateRow[];
}

export interface UserProfile {
  id: number;
  email: string;
  role: string;
}

export const DISCOUNT_TYPES = ["flat", "percentage"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface SaleItem {
  id: number;
  productVariantId: number;
  brandNameSnapshot: string;
  dosageFormSnapshot: string;
  strengthSnapshot: string | null;
  /** The unit it was sold in, e.g. "strip". */
  unitNameSnapshot: string;
  qtyInBase: number;
  baseQtyDeducted: number;
  unitPrice: number;
  /** In the sold unit. */
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  createdById: number;
  createdBy?: UserProfile;
  /** Only on `GET /sales/:id`; the list response omits line items. */
  items?: SaleItem[];
  createdAt: string;
}

export interface LowStockItem {
  variant_id: number;
  brand_name: string;
  dosage_form: string;
  strength: string | null;
  manufacturer: string;
  stock_quantity: number;
  base_unit: string;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  total_earning: number;
  total_units_sold: number;
  total_transactions: number;
  distinct_products_sold: number;
}

export const SUMMARY_PERIODS = ["today", "this_week", "this_month"] as const;
export type SummaryPeriod = (typeof SUMMARY_PERIODS)[number];

export const CHECKOUT_FAILURE_REASONS = [
  "not_found",
  "inactive",
  "not_priced",
  "unit_not_found",
  "unit_not_sellable",
  "insufficient_stock",
  "duplicate_item",
  "stock_changed",
] as const;
export type CheckoutFailureReason = (typeof CHECKOUT_FAILURE_REASONS)[number];

export interface CheckoutItemFailure {
  variant_id: number;
  unit_id?: number;
  reason: CheckoutFailureReason;
  message: string;
  requested_quantity?: number;
  available_quantity?: number;
}

export interface SkippedRow {
  /** 1-based line number in the source file. */
  line: number;
  reason: string;
}

export interface ImportResult {
  rowsParsed: number;
  rowsSkipped: number;
  variantsCreated: number;
  variantsUpdated: number;
  productsTotal: number;
  manufacturersTotal: number;
  genericsTotal: number;
  variantsTotal: number;
  durationMs: number;
  /** Rejected rows, capped at 100 entries by the API. */
  skipped: SkippedRow[];
}
