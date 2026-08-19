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
  price: number | null;
  stockQuantity: number | null;
  priceUpdatedAt: string | null;
  isActive: boolean;
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
  unitPrice: number;
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
  "insufficient_stock",
  "duplicate_item",
  "stock_changed",
] as const;
export type CheckoutFailureReason = (typeof CHECKOUT_FAILURE_REASONS)[number];

export interface CheckoutItemFailure {
  variant_id: number;
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
