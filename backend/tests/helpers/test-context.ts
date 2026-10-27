import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config/env.js';
import { silentLogger } from '../../src/core/logger.js';
import type { Product, UserProfile } from '../../src/core/types.js';
import {
  FakeCatalogClient,
  FakeIdentityAdmin,
  FakeTokenVerifier,
  InMemoryProductRepository,
  InMemoryStatisticsRepository,
  InMemoryStockRepository,
  InMemoryUserRepository,
} from './in-memory-repositories.js';

export const BARCODES = {
  milk: '3560070976453',
  nutella: '3017620422003',
  catalogOnly: '9999999999999',
} as const;

export const TOKENS = {
  employee: 'employee-token',
  supervisor: 'supervisor-token',
  admin: 'admin-token',
  unprovisioned: 'unprovisioned-token',
} as const;

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    port: 0,
    logLevel: 'silent',
    corsOrigins: [],
    firebase: {},
    lowStockThreshold: 5,
    rateLimit: { enabled: false, windowMs: 60_000, max: 1_000 },
    openFoodFacts: {
      baseUrl: 'https://world.openfoodfacts.org',
      userAgent: 'test-agent',
      timeoutMs: 1_000,
      productCacheTtlMs: 0,
      searchCacheTtlMs: 0,
    },
    ...overrides,
  };
}

function user(uid: string, name: string, email: string, role: UserProfile['role']): UserProfile {
  return { uid, name, email, role, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: null };
}

function product(
  barcode: string,
  name: string,
  brand: string,
  category: string,
  imageUrl: string | null = null,
): Product {
  return {
    barcode,
    name,
    imageUrl,
    brand,
    category,
    quantityLabel: '1 L',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

export function createTestContext(options: { readiness?: () => Promise<boolean> } = {}) {
  const config = testConfig();

  const users = new InMemoryUserRepository();
  users.seed(user('emp-1', 'Elena Empleada', 'elena@carrefour.test', 'employee'));
  users.seed(user('sup-1', 'Sergio Supervisor', 'sergio@carrefour.test', 'supervisor'));
  users.seed(user('admin-1', 'Ana Admin', 'ana@carrefour.test', 'admin'));

  const products = new InMemoryProductRepository();
  products.products.set(
    BARCODES.milk,
    product(BARCODES.milk, 'Leche entera Carrefour', 'Carrefour', 'Lácteos', 'https://img.test/milk.jpg'),
  );
  products.products.set(
    BARCODES.nutella,
    product(BARCODES.nutella, 'Crema de cacao Nutella', 'Ferrero', 'Desayuno'),
  );

  const stock = new InMemoryStockRepository();
  stock.stock.set(BARCODES.milk, {
    barcode: BARCODES.milk,
    quantity: 48,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
  stock.stock.set(BARCODES.nutella, {
    barcode: BARCODES.nutella,
    quantity: 3,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  const statistics = new InMemoryStatisticsRepository();
  statistics.views.set(BARCODES.milk, 10);
  statistics.views.set(BARCODES.nutella, 3);

  const verifier = new FakeTokenVerifier();
  verifier.register(TOKENS.employee, 'emp-1', 'elena@carrefour.test');
  verifier.register(TOKENS.supervisor, 'sup-1', 'sergio@carrefour.test');
  verifier.register(TOKENS.admin, 'admin-1', 'ana@carrefour.test');
  verifier.register(TOKENS.unprovisioned, 'ghost-1', 'ghost@carrefour.test');

  const catalog = new FakeCatalogClient();
  catalog.products.set(
    BARCODES.catalogOnly,
    product(BARCODES.catalogOnly, 'Café molido Carrefour', 'Carrefour', 'Café'),
  );
  catalog.products.set(
    BARCODES.milk,
    product(BARCODES.milk, 'Leche entera Carrefour', 'Carrefour', 'Lácteos'),
  );

  const identity = new FakeIdentityAdmin();

  const app = createApp({
    config,
    logger: silentLogger,
    verifier,
    identity,
    users,
    products,
    stock,
    statistics,
    catalog,
    ...(options.readiness ? { readiness: options.readiness } : {}),
  });

  return { app, config, users, products, stock, statistics, verifier, catalog, identity };
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
