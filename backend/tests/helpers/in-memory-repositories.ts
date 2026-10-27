import { nowIso } from '../../src/core/date.js';
import { upstreamError } from '../../src/core/errors.js';
import type {
  FoodCatalogClient,
  IdentityAdmin,
  ProductRepository,
  StatisticsRepository,
  StockRepository,
  TokenVerifier,
  UserRepository,
} from '../../src/core/ports.js';
import type {
  Product,
  ProvisionUserInput,
  Role,
  StatisticsEntry,
  Stock,
  UserProfile,
} from '../../src/core/types.js';

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryUserRepository implements UserRepository {
  readonly users = new Map<string, UserProfile>();

  seed(user: UserProfile): void {
    this.users.set(user.uid, clone(user));
  }

  async findById(uid: string): Promise<UserProfile | null> {
    const user = this.users.get(uid);
    return user ? clone(user) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) return clone(user);
    }
    return null;
  }

  async list(): Promise<UserProfile[]> {
    return [...this.users.values()]
      .map(clone)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(input: UserProfile): Promise<UserProfile> {
    const timestamp = nowIso();
    const user: UserProfile = {
      ...input,
      email: input.email.toLowerCase(),
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.users.set(user.uid, clone(user));
    return clone(user);
  }

  async updateRole(uid: string, role: Role): Promise<UserProfile | null> {
    const user = this.users.get(uid);
    if (!user) return null;
    user.role = role;
    user.updatedAt = nowIso();
    return clone(user);
  }

  async countByRole(role: Role): Promise<number> {
    return [...this.users.values()].filter((user) => user.role === role).length;
  }

  async delete(uid: string): Promise<void> {
    this.users.delete(uid);
  }
}

export class InMemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, Product>();

  async findByBarcode(barcode: string): Promise<Product | null> {
    const product = this.products.get(barcode);
    return product ? clone(product) : null;
  }

  async findByBarcodes(barcodes: string[]): Promise<Product[]> {
    return barcodes
      .map((barcode) => this.products.get(barcode))
      .filter((product): product is Product => product !== undefined)
      .map(clone);
  }

  async listRecent(limit: number): Promise<Product[]> {
    return [...this.products.values()]
      .reverse()
      .slice(0, limit)
      .map(clone);
  }

  async searchByNamePrefix(term: string, limit: number): Promise<Product[]> {
    const normalized = term.trim().toLowerCase();
    return [...this.products.values()]
      .filter((product) => product.name.toLowerCase().startsWith(normalized))
      .slice(0, limit)
      .map(clone);
  }

  async upsert(product: Omit<Product, 'updatedAt'>): Promise<Product> {
    const stored: Product = { ...product, updatedAt: nowIso() };
    this.products.set(stored.barcode, stored);
    return clone(stored);
  }
}

export class InMemoryStockRepository implements StockRepository {
  readonly stock = new Map<string, Stock>();

  async findByBarcode(barcode: string): Promise<Stock | null> {
    const entry = this.stock.get(barcode);
    return entry ? clone(entry) : null;
  }

  async findByBarcodes(barcodes: string[]): Promise<Stock[]> {
    return barcodes
      .map((barcode) => this.stock.get(barcode))
      .filter((entry): entry is Stock => entry !== undefined)
      .map(clone);
  }

  async setQuantity(barcode: string, quantity: number): Promise<Stock> {
    const stock: Stock = { barcode, quantity, updatedAt: nowIso() };
    this.stock.set(barcode, stock);
    return clone(stock);
  }

  async listLowStock(threshold: number, limit: number): Promise<Stock[]> {
    return [...this.stock.values()]
      .filter((stock) => stock.quantity <= threshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, limit)
      .map(clone);
  }

  async getSummary(lowStockThreshold: number): Promise<{
    totalProducts: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const values = [...this.stock.values()];
    return {
      totalProducts: values.length,
      totalUnits: values.reduce((total, stock) => total + stock.quantity, 0),
      lowStockCount: values.filter((stock) => stock.quantity <= lowStockThreshold).length,
      outOfStockCount: values.filter((stock) => stock.quantity === 0).length,
    };
  }
}

export class InMemoryStatisticsRepository implements StatisticsRepository {
  readonly views = new Map<string, number>();

  async registerView(barcode: string): Promise<void> {
    this.views.set(barcode, (this.views.get(barcode) ?? 0) + 1);
  }

  async topViewed(limit: number): Promise<StatisticsEntry[]> {
    return [...this.views.entries()]
      .map(([barcode, views]) => ({ barcode, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}

export class FakeTokenVerifier implements TokenVerifier {
  readonly identities = new Map<string, { uid: string; email: string | null; name: string | null }>();

  register(token: string, uid: string, email: string | null = null): void {
    this.identities.set(token, { uid, email, name: null });
  }

  async verify(token: string): Promise<{ uid: string; email: string | null; name: string | null }> {
    const identity = this.identities.get(token);
    if (!identity) throw new Error('invalid token');
    return identity;
  }
}

export class FakeCatalogClient implements FoodCatalogClient {
  readonly products = new Map<string, Product>();
  failOnGet = false;
  failOnSearch = false;
  searchCalls: string[] = [];

  async getProduct(barcode: string): Promise<Product | null> {
    if (this.failOnGet) throw upstreamError();
    return this.products.get(barcode) ?? null;
  }

  async search(term: string, limit: number): Promise<Product[]> {
    this.searchCalls.push(term);
    if (this.failOnSearch) throw upstreamError();
    const normalized = term.toLowerCase();
    return [...this.products.values()]
      .filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          (product.brand ?? '').toLowerCase().includes(normalized),
      )
      .slice(0, limit);
  }
}

export class FakeIdentityAdmin implements IdentityAdmin {
  readonly created = new Map<string, ProvisionUserInput>();
  readonly deleted: string[] = [];
  private sequence = 0;

  async createUser(input: ProvisionUserInput): Promise<{ uid: string }> {
    if ([...this.created.values()].some((user) => user.email === input.email)) {
      throw Object.assign(new Error('email exists'), { code: 'auth/email-already-exists' });
    }
    this.sequence += 1;
    const uid = `new-user-${this.sequence}`;
    this.created.set(uid, { ...input });
    return { uid };
  }

  async createPasswordResetLink(email: string): Promise<string> {
    return `https://reset.test/${encodeURIComponent(email)}`;
  }

  async deleteUser(uid: string): Promise<void> {
    this.deleted.push(uid);
    this.created.delete(uid);
  }
}
