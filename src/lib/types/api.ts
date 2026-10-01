export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ──────────────────────────────────────────────
// Analytics
// ──────────────────────────────────────────────

export interface LowStockItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string | null;
  color: string | null;
  stock: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

/** Dashboard figures. Days are Lagos days; revenue is paid orders by payment date. */
export interface AnalyticsOverview {
  timezone: string;
  revenue: {
    total: number;
    today: number;
    last30Days: number;
    previous30Days: number;
    /** Null when there's nothing to compare with. */
    changePercent: number | null;
    currency: string;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    last30Days: number;
    previous30Days: number;
    changePercent: number | null;
    /** Pay-on-delivery orders waiting to be confirmed. */
    toConfirm: number;
    /** Confirmed or paid, not shipped yet. */
    toShip: number;
    inTransit: number;
  };
  cashToCollect: { amount: number; orders: number };
  products: {
    total: number;
    lowStock: LowStockItem[];
    lowStockThreshold: number;
  };
  /** One entry per day for the last 30 days, oldest first. */
  dailyRevenue: DailyRevenue[];
  recentOrders: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

// ──────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────

export interface ProductImage {
  id?: string;
  productId?: string;
  imageUrl: string;
  altText?: string | null;
  displayOrder?: number;
}

export interface ProductVariant {
  id?: string;
  productId?: string;
  size?: string | null;
  color?: string | null;
  stockQuantity: number;
  priceOverride?: number | null;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  originalPrice?: number | null;
  sku?: string | null;
  brand?: string | null;
  badge?: "sale" | "new" | "hot" | null;
  discount?: number | null;
  categoryId?: string | null;
  inStock: boolean;
  /** Archived products are hidden from the shop but kept for past orders. */
  status: "draft" | "active" | "archived";
  image?: string | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  products: Product[];
  pagination: PaginationMeta;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  sku?: string;
  brand?: string;
  badge?: "sale" | "new" | "hot";
  discount?: number;
  categoryId?: string;
  inStock?: boolean;
  status?: "draft" | "active";
  images?: { imageUrl: string; altText?: string }[];
  variants?: {
    size?: string;
    color?: string;
    stockQuantity: number;
    priceOverride?: number;
  }[];
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  images?: { id?: string; imageUrl: string; altText?: string }[];
  variants?: {
    id?: string;
    size?: string;
    color?: string;
    stockQuantity: number;
    priceOverride?: number;
  }[];
}

// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string | null;
  parentId?: string | null;
  displayOrder: number;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  iconUrl?: string;
  parentId?: string;
  displayOrder?: number;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

// ──────────────────────────────────────────────
// Orders
// ──────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  size?: string | null;
  color?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  guestEmail?: string | null;
  customerEmail?: string | null;
  /** The person to deliver to (from the address), else the account name. */
  customerName?: string | null;
  customerPhone?: string | null;
  /** Name on the customer's account, when they were signed in. */
  accountName?: string | null;
  deliveryState?: string | null;
  /** Null on orders placed before these were recorded. */
  paymentMethod?: "paystack" | "cod" | null;
  shippingMethod?: "standard" | "express" | null;
  subtotal?: number | null;
  discountAmount?: number;
  discountCode?: string | null;
  shippingFee?: number;
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentReference?: string | null;
  paidAt?: string | null;
  shippingAddress?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  } | null;
  items?: OrderItem[];
  /** Statuses staff may move this order to next (detail endpoint only). */
  allowedStatuses?: Order["status"][];
  timeline?: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderEvent {
  id: string;
  type: "placed" | "payment_received" | "status_changed" | "payment_status_changed" | "cancelled" | "note";
  fromStatus: string | null;
  toStatus: string | null;
  message: string | null;
  /** Null when the customer or the system did it. */
  actorName: string | null;
  createdAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface UpdateOrderInput {
  orderId: string;
  status?: Order["status"];
  paymentStatus?: Order["paymentStatus"];
  /** Added to the order's timeline. */
  note?: string;
}

// ──────────────────────────────────────────────
// Discounts
// ──────────────────────────────────────────────

export interface Discount {
  id: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  value: number;
  minOrderAmount?: number | null;
  maxUses?: number | null;
  usedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  /** What a shopper would get with this code right now. */
  state: "active" | "paused" | "scheduled" | "expired" | "used_up";
  createdAt: string;
}

export interface DiscountListResponse {
  discounts: Discount[];
  pagination: PaginationMeta;
}

export interface CreateDiscountInput {
  code: string;
  discountType: "percentage" | "fixed_amount";
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  startsAt?: string;
  expiresAt?: string;
  isActive?: boolean;
}

export type UpdateDiscountInput = Partial<CreateDiscountInput>;

// ──────────────────────────────────────────────
// Hero Slides
// ──────────────────────────────────────────────

export interface HeroSlide {
  id: string;
  boldText?: string | null;
  regularText?: string | null;
  linkText?: string | null;
  href?: string | null;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateHeroSlideInput {
  boldText?: string;
  regularText?: string;
  linkText?: string;
  href?: string;
  imageUrl: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateHeroSlideInput = Partial<CreateHeroSlideInput>;

// ──────────────────────────────────────────────
// Customers
// ──────────────────────────────────────────────

/** A customer account, or a guest grouped by the email they checked out with. */
export interface Customer {
  /** "u:<userId>" or "g:<email>". */
  id: string;
  userId: string | null;
  type: "account" | "guest";
  name: string | null;
  email: string | null;
  phone: string | null;
  /** When they created an account; null for guests. */
  registeredAt: string | null;
  /** Orders that weren't cancelled. */
  totalOrders: number;
  /** Paid orders only. */
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: PaginationMeta;
}

// ──────────────────────────────────────────────
// Media Upload
// ──────────────────────────────────────────────

export interface UploadUrlResponse {
  uploadUrl: string;
  token: string;
  publicUrl: string;
  path: string;
  bucket: string;
}

// ──────────────────────────────────────────────
// Admin Team & Roles (RBAC)
// ──────────────────────────────────────────────

export type AdminRole = "super_admin" | "admin";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: "active" | "invited" | "suspended";
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AdminListResponse {
  admins: AdminUser[];
  pagination?: PaginationMeta;
}

export interface InviteAdminInput {
  name: string;
  email: string;
  role: AdminRole;
}

export interface InviteResult extends AdminUser {
  invitation: {
    emailSent: boolean;
    /** Only when the email couldn't be sent, to pass on by hand. */
    setupLink: string | null;
  };
}

export interface UpdateAdminInput {
  adminId: string;
  role?: AdminRole;
  status?: "active" | "suspended";
}

// ──────────────────────────────────────────────
// Shipping Rates / Delivery Fees
// ──────────────────────────────────────────────

export interface ShippingRate {
  id: string;
  state: string;
  zone: string;
  zoneName?: string;
  standardBase: number;
  expressBase: number;
  estimatedDaysStandard: string;
  estimatedDaysExpress: string;
  freeShippingThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingRatesResponse {
  shippingRates: ShippingRate[];
  pagination: PaginationMeta;
  summary: {
    total: number;
    zoneCounts: Record<string, number>;
    zoneNames: Record<string, string>;
  };
}

export interface CreateShippingRateInput {
  state: string;
  zone: string;
  standardBase: number;
  expressBase: number;
  estimatedDaysStandard: string;
  estimatedDaysExpress: string;
  freeShippingThreshold: number;
  isActive?: boolean;
}

export type UpdateShippingRateInput = Partial<CreateShippingRateInput>;

export interface BulkUpdateShippingInput {
  targetType: "zone" | "ids";
  zone?: string;
  ids?: string[];
  standardBase?: number;
  expressBase?: number;
  estimatedDaysStandard?: string;
  estimatedDaysExpress?: string;
  freeShippingThreshold?: number;
  isActive?: boolean;
}
