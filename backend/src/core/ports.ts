import type {
  Product,
  ProvisionUserInput,
  Role,
  StatisticsEntry,
  Stock,
  UserProfile,
} from './types.js';

export interface UserRepository {
  findById(uid: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  list(): Promise<UserProfile[]>;
  create(input: UserProfile): Promise<UserProfile>;
  updateRole(uid: string, role: Role): Promise<UserProfile | null>;
  countByRole(role: Role): Promise<number>;
  delete(uid: string): Promise<void>;
}

export interface ProductRepository {
  findByBarcode(barcode: string): Promise<Product | null>;
  findByBarcodes(barcodes: string[]): Promise<Product[]>;
  listRecent(limit: number): Promise<Product[]>;
  searchByNamePrefix(term: string, limit: number): Promise<Product[]>;
  upsert(product: Omit<Product, 'updatedAt'>): Promise<Product>;
}

export interface StockRepository {
  findByBarcode(barcode: string): Promise<Stock | null>;
  findByBarcodes(barcodes: string[]): Promise<Stock[]>;
  setQuantity(barcode: string, quantity: number): Promise<Stock>;
  listLowStock(threshold: number, limit: number): Promise<Stock[]>;
  getSummary(lowStockThreshold: number): Promise<{
    totalProducts: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  }>;
}

export interface StatisticsRepository {
  registerView(barcode: string): Promise<void>;
  topViewed(limit: number): Promise<StatisticsEntry[]>;
}

/** Product catalog provider (OpenFoodFacts in production, fake in tests). */
export interface FoodCatalogClient {
  getProduct(barcode: string): Promise<Product | null>;
  search(term: string, limit: number): Promise<Product[]>;
}

export interface TokenVerifier {
  verify(token: string): Promise<{
    uid: string;
    email: string | null;
    name: string | null;
  }>;
}

/** Firebase Authentication side effects needed by admin user management. */
export interface IdentityAdmin {
  createUser(input: ProvisionUserInput): Promise<{ uid: string }>;
  createPasswordResetLink(email: string): Promise<string>;
  deleteUser(uid: string): Promise<void>;
}
