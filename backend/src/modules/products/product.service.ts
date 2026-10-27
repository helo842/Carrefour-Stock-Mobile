import { notFound } from '../../core/errors.js';
import type { Logger } from '../../core/logger.js';
import type {
  FoodCatalogClient,
  ProductRepository,
  StatisticsRepository,
  StockRepository,
} from '../../core/ports.js';
import type { Product, ProductWithStock } from '../../core/types.js';
import { joinProductsWithStock } from './product.utils.js';

const BARCODE_PATTERN = /^\d{8,14}$/;

interface ProductServiceDependencies {
  products: ProductRepository;
  stock: StockRepository;
  statistics: StatisticsRepository;
  catalog: FoodCatalogClient;
  logger: Logger;
}

export class ProductService {
  constructor(private readonly deps: ProductServiceDependencies) {}

  /**
   * Lists recently consulted/cached products, optionally filtered by a search
   * term. Text search is delegated to OpenFoodFacts when the local catalog has
   * no matches, and results are cached locally for later stock joins.
   */
  async list(input: { q?: string; limit: number }): Promise<ProductWithStock[]> {
    const term = input.q?.trim() ?? '';

    if (!term) {
      const recent = await this.deps.products.listRecent(input.limit);
      return this.attachStock(recent);
    }

    if (BARCODE_PATTERN.test(term)) {
      const product = await this.findOrFetch(term, { registerView: false });
      return product ? this.attachStock([product]) : [];
    }

    const localMatches = await this.deps.products
      .searchByNamePrefix(term, input.limit)
      .catch((error: unknown) => {
        this.deps.logger.warn({ err: error }, 'Local product search failed');
        return [] as Product[];
      });

    let externalMatches: Product[] = [];
    try {
      externalMatches = await this.deps.catalog.search(term, input.limit);
    } catch (error) {
      // OpenFoodFacts is a dependency, not a single point of failure: if the
      // local catalog can answer, do so instead of failing the request.
      if (localMatches.length === 0) throw error;
      this.deps.logger.warn(
        { err: error },
        'OpenFoodFacts search failed; serving local matches',
      );
    }

    const merged = dedupeByBarcode([...externalMatches, ...localMatches]).slice(
      0,
      input.limit,
    );

    await this.persist(merged);
    return this.attachStock(merged);
  }

  /**
   * Returns a product joined with its stock and records the view. The local
   * catalog is checked first; on a miss the product is fetched from
   * OpenFoodFacts and cached in Firestore.
   */
  async getByBarcode(
    barcode: string,
    options: { registerView?: boolean } = {},
  ): Promise<ProductWithStock> {
    const product = await this.findOrFetch(barcode, {
      registerView: options.registerView ?? true,
    });

    if (!product) {
      throw notFound(
        `No se ha encontrado ningún producto con el código ${barcode}.`,
        'PRODUCT_NOT_FOUND',
      );
    }

    return product;
  }

  private async findOrFetch(
    barcode: string,
    options: { registerView: boolean },
  ): Promise<ProductWithStock | null> {
    let product = await this.deps.products.findByBarcode(barcode);

    if (!product) {
      const external = await this.deps.catalog.getProduct(barcode);
      if (!external) return null;
      product = await this.deps.products.upsert(external);
    }

    const stock = await this.deps.stock.findByBarcode(barcode);

    if (options.registerView) {
      // Statistics are best effort: a failure must not break the consultation.
      try {
        await this.deps.statistics.registerView(barcode);
      } catch (error) {
        this.deps.logger.warn({ err: error, barcode }, 'Could not register product view');
      }
    }

    return { ...product, stock };
  }

  private async attachStock(products: Product[]): Promise<ProductWithStock[]> {
    if (products.length === 0) return [];

    const stocks = await this.deps.stock.findByBarcodes(
      products.map((product) => product.barcode),
    );

    return joinProductsWithStock(products, stocks);
  }

  private async persist(products: Product[]): Promise<void> {
    const results = await Promise.allSettled(
      products.map((product) => this.deps.products.upsert(product)),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        this.deps.logger.warn({ err: result.reason }, 'Could not cache product');
      }
    }
  }
}

function dedupeByBarcode(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.barcode)) return false;
    seen.add(product.barcode);
    return true;
  });
}
