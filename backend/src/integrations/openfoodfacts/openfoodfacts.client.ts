import { TtlCache } from '../../core/cache.js';
import { isAppError, upstreamError } from '../../core/errors.js';
import type { Logger } from '../../core/logger.js';
import type { FoodCatalogClient } from '../../core/ports.js';
import type { Product } from '../../core/types.js';
import { mapOpenFoodFactsProduct } from './mapper.js';

const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_es',
  'generic_name',
  'generic_name_es',
  'brands',
  'categories',
  'image_front_url',
  'image_url',
  'quantity',
].join(',');

const SEARCH_FIELDS = PRODUCT_FIELDS;
const RETRY_DELAY_MS = 350;
const MAX_ATTEMPTS = 2;

interface OpenFoodFactsConfig {
  baseUrl: string;
  userAgent: string;
  timeoutMs: number;
  productCacheTtlMs: number;
  searchCacheTtlMs: number;
}

interface RequestResult {
  status: number;
  body: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * OpenFoodFacts integration.
 *
 * - One retry with a short delay for transient failures.
 * - Bounded in-memory cache (product reads and searches) to respect the
 *   public API rate limits.
 * - Upstream failures are surfaced as 503, never as 500.
 */
export class OpenFoodFactsClient implements FoodCatalogClient {
  private readonly cache = new TtlCache<Product | Product[] | null>(1_000);

  constructor(
    private readonly config: OpenFoodFactsConfig,
    private readonly logger: Logger,
  ) {}

  async getProduct(barcode: string): Promise<Product | null> {
    const cacheKey = `product:${barcode}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached as Product | null;

    const url = `${this.config.baseUrl}/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json?fields=${PRODUCT_FIELDS}`;

    const result = await this.request(url, `product ${barcode}`);
    const body = result.body as { status?: unknown; product?: unknown } | null;

    const mapped =
      result.status === 200 && body?.status === 1
        ? mapOpenFoodFactsProduct(body.product, barcode)
        : null;

    this.cache.set(cacheKey, mapped, this.config.productCacheTtlMs);
    return mapped;
  }

  async search(term: string, limit: number): Promise<Product[]> {
    const cacheKey = `search:${limit}:${term.toLowerCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) return cached as Product[];

    const params = new URLSearchParams({
      search_terms: term,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(limit),
      fields: SEARCH_FIELDS,
    });

    const result = await this.request(
      `${this.config.baseUrl}/cgi/search.pl?${params.toString()}`,
      `search "${term}"`,
    );

    const body = result.body as { products?: unknown } | null;
    const rawProducts = Array.isArray(body?.products) ? body.products : [];

    const seen = new Set<string>();
    const products: Product[] = [];

    for (const raw of rawProducts) {
      const product = mapOpenFoodFactsProduct(raw);
      if (!product || seen.has(product.barcode)) continue;
      seen.add(product.barcode);
      products.push(product);
      if (products.length >= limit) break;
    }

    this.cache.set(cacheKey, products, this.config.searchCacheTtlMs);
    return products;
  }

  private async request(url: string, operation: string): Promise<RequestResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': this.config.userAgent,
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        if (response.status === 404) {
          return { status: 404, body: null };
        }

        if (!response.ok) {
          if (isRetryableStatus(response.status) && attempt < MAX_ATTEMPTS) {
            await sleep(RETRY_DELAY_MS);
            continue;
          }
          this.logger.warn(
            { status: response.status, operation },
            'OpenFoodFacts returned an error status',
          );
          throw upstreamError();
        }

        return { status: response.status, body: (await response.json()) as unknown };
      } catch (error) {
        if (isAppError(error)) throw error;
        lastError = error;
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
      }
    }

    this.logger.warn({ err: lastError, operation }, 'OpenFoodFacts request failed');
    throw upstreamError();
  }
}
