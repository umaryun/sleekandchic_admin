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

export interface AnalyticsOverview {
  revenue: {
    total: number;
    currency: string;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
  };
  products: {
    total: number;
    lowStock: LowStockItem[];
  };
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
  customerName?: string | null;
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "unpaid" | "paid" | "refunded";
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  } | null;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: PaginationMeta;
}

export interface UpdateOrderInput {
  orderId: string;
  status?: Order["status"];
  paymentStatus?: Order["paymentStatus"];
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

export interface Customer {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: string;
  isAnonymous?: boolean;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
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
  password?: string;
}

export interface UpdateAdminInput {
  adminId: string;
  role?: AdminRole;
  status?: "active" | "suspended";
}
