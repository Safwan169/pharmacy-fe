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
  /** Only on `GET /variants/:id`: batches with stock plus recently emptied ones. */
  batches?: StockBatch[];
}

/** One received lot. Quantities are in the variant's base unit. */
export interface StockBatch {
  id: number;
  variantId: number;
  batchNo: string | null;
  /** `YYYY-MM-DD`, or null for stock entered without a date (sells last). */
  expiryDate: string | null;
  quantity: number;
  initialQuantity: number;
  costPrice: number | null;
  receivedAt: string;
}

export interface ExpiringItem {
  batch_id: number;
  variant_id: number;
  brand_name: string;
  dosage_form: string;
  strength: string | null;
  manufacturer: string;
  batch_no: string | null;
  expiry_date: string;
  /** Negative once expired. */
  days_left: number;
  quantity: number;
  base_unit: string;
  value_at_cost: number | null;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
}

export interface StockReceiptItem {
  id: number;
  variantId: number;
  variant?: ProductVariant;
  batchId: number;
  batchNo: string | null;
  expiryDate: string | null;
  /** The unit it was bought in, e.g. "box". */
  unitName: string;
  qtyInBase: number;
  /** In the purchase unit. */
  quantity: number;
  baseQuantity: number;
  unitCost: number;
  lineCost: number;
}

/** A goods-received note — one delivery. */
export interface StockReceipt {
  id: number;
  receiptNumber: string;
  supplierId: number | null;
  supplier: Supplier | null;
  supplierInvoiceNo: string | null;
  receivedAt: string;
  totalCost: number;
  note: string | null;
  createdBy?: { id: number; email: string };
  /** Only on `GET /stock/receipts/:id`. */
  items?: StockReceiptItem[];
  createdAt: string;
}

export const MOVEMENT_TYPES = [
  "sale",
  "sale_return",
  "stock_in",
  "adjustment",
  "expired_writeoff",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface StockMovement {
  id: number;
  variantId: number;
  variant: ProductVariant;
  batchId: number | null;
  batch: StockBatch | null;
  type: MovementType;
  /** Signed, base units. */
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string | null;
  referenceId: number | null;
  note: string | null;
  createdBy?: { id: number; email: string };
  createdAt: string;
}

export const EXPIRY_WINDOWS = [30, 60, 90] as const;
export type ExpiryWindow = (typeof EXPIRY_WINDOWS)[number];

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

export const ROLES = ["owner", "cashier"] as const;
export type Role = (typeof ROLES)[number];

export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  role: Role | string;
}

/** A row from `GET /users` (owner only). */
export interface ManagedUser {
  id: number;
  email: string;
  name: string | null;
  role: Role | string;
  is_active: boolean;
  created_at: string;
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
  batchId: number | null;
  unitNameSnapshot: string;
  qtyInBase: number;
  baseQtyDeducted: number;
  unitPrice: number;
  /** In the sold unit. */
  quantity: number;
  /** How many of `quantity` have come back. */
  returnedQuantity: number;
  lineTotal: number;
}

export const PAYMENT_METHODS = ["cash", "bkash", "due"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bkash: "bKash",
  due: "Due (pay later)",
};

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  dueBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface DueCustomer {
  id: number;
  name: string;
  phone: string | null;
  due_balance: number;
  oldest_due_at: string | null;
  open_sales: number;
}

export interface DuePayment {
  id: number;
  customerId: number;
  customer?: Customer;
  saleId: number | null;
  receiptNumber: string;
  amount: number;
  method: "cash" | "bkash";
  bkashTrxId: string | null;
  note: string | null;
  balanceAfter: number;
  createdAt: string;
}

export interface ShopSettings {
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  drug_license_no: string;
  receipt_footer: string;
  low_stock_threshold: string;
  receipt_width_mm: string;
}

export interface DailyClosing {
  date: string;
  sales_count: number;
  gross_sales: number;
  discounts: number;
  refunds: number;
  net_sales: number;
  by_method: { cash: number; bkash: number; due: number };
  refunds_by_method: { cash: number; bkash: number; due_adjust: number };
  due_collected: { cash: number; bkash: number };
  cash_in_drawer_expected: number;
  voided_count: number;
  top_items: { variant_id: number; name: string; unit: string; quantity: number; amount: number }[];
  cashier_breakdown: { user_id: number; name: string; sales_count: number; amount: number }[];
}

export interface ProfitDay {
  date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number | null;
  uncosted_lines: number;
}

export interface ProfitReport {
  from: string;
  to: string;
  total: ProfitDay;
  by_day: ProfitDay[];
  by_product: { variant_id: number; name: string; quantity_base: number; revenue: number; cogs: number; gross_profit: number }[];
}

export interface StockValue {
  value_at_cost: number;
  value_at_price: number;
  expired_value_at_cost: number;
  uncosted_units: number;
  batches_in_stock: number;
  variants_in_stock: number;
}

export interface BackupFile {
  name: string;
  size_bytes: number;
  created_at: string;
}

export const SALE_STATUSES = ["completed", "voided", "returned", "partial_return"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  completed: "Completed",
  voided: "Voided",
  returned: "Returned",
  partial_return: "Part returned",
};

export const REFUND_METHODS = ["cash", "bkash", "due_adjust"] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  cash: "Cash",
  bkash: "bKash",
  due_adjust: "Take off their due balance",
};

export interface SaleReturnItem {
  id: number;
  saleItemId: number;
  saleItem?: SaleItem;
  quantity: number;
  baseQuantity: number;
  refundAmount: number;
  restock: boolean;
}

export interface SaleReturn {
  id: number;
  saleId: number;
  returnNumber: string;
  refundAmount: number;
  refundMethod: RefundMethod;
  reason: string | null;
  items?: SaleReturnItem[];
  createdAt: string;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  subtotal: number;
  discountType: DiscountType | null;
  discountValue: number | null;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  customerId: number | null;
  customer?: Customer | null;
  amountTendered: number | null;
  changeGiven: number | null;
  bkashTrxId: string | null;
  paidAmount: number;
  dueAmount: number;
  createdById: number;
  createdBy?: { id: number; email: string; name?: string | null; role?: string };
  /** Only on `GET /sales/:id`; the list response omits line items. */
  items?: SaleItem[];
  status: SaleStatus;
  voidedAt: string | null;
  voidedBy?: { id: number; email: string } | null;
  voidReason: string | null;
  /** Only on `GET /sales/:id`. */
  returns?: SaleReturn[];
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
  total_refunds: number;
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
  "expired_only",
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
