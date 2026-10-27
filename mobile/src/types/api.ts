export const ROLES = ['employee', 'supervisor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Product {
  barcode: string;
  name: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
  quantityLabel: string | null;
  updatedAt: string | null;
}

export interface Stock {
  barcode: string;
  quantity: number;
  updatedAt: string | null;
}

export interface ProductWithStock extends Product {
  stock: Stock | null;
}

export interface DashboardSummary {
  totalProducts: number;
  totalUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockThreshold: number;
}

export interface Dashboard {
  summary: DashboardSummary;
  topViewed: ProductWithStock[];
  lowStock: ProductWithStock[] | null;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export interface CreatedUser {
  profile: UserProfile;
  passwordResetLink: string | null;
}
