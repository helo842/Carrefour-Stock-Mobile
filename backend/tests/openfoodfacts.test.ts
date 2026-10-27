import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/core/errors.js';
import { silentLogger } from '../src/core/logger.js';
import { mapOpenFoodFactsProduct } from '../src/integrations/openfoodfacts/mapper.js';
import { OpenFoodFactsClient } from '../src/integrations/openfoodfacts/openfoodfacts.client.js';

const clientConfig = {
  baseUrl: 'https://off.test',
  userAgent: 'test-agent',
  timeoutMs: 1_000,
  productCacheTtlMs: 60_000,
  searchCacheTtlMs: 60_000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const rawProduct = {
  code: '3560070976453',
  product_name: 'Whole milk',
  product_name_es: 'Leche entera Carrefour',
  brands: 'Carrefour, Carrefour Bio',
  categories: 'Lácteos, Leches',
  image_front_url: 'http://images.test/milk.jpg',
  quantity: '1 L',
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('OpenFoodFacts mapper', () => {
  it('maps the Spanish name, first brand/category and normalizes the image URL', () => {
    const product = mapOpenFoodFactsProduct(rawProduct);

    expect(product).toEqual({
      barcode: '3560070976453',
      name: 'Leche entera Carrefour',
      imageUrl: 'https://images.test/milk.jpg',
      brand: 'Carrefour',
      category: 'Lácteos',
      quantityLabel: '1 L',
      updatedAt: null,
    });
  });

  it('returns null for records without a valid barcode or name', () => {
    expect(mapOpenFoodFactsProduct({ ...rawProduct, code: 'abc' })).toBeNull();
    expect(
      mapOpenFoodFactsProduct({
        ...rawProduct,
        product_name_es: ' ',
        product_name: ' ',
      }),
    ).toBeNull();
    expect(mapOpenFoodFactsProduct(null)).toBeNull();
  });
});

describe('OpenFoodFacts client', () => {
  it('fetches a product and caches it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ status: 1, product: rawProduct }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new OpenFoodFactsClient(clientConfig, silentLogger);
    const first = await client.getProduct('3560070976453');
    const second = await client.getProduct('3560070976453');

    expect(first?.name).toBe('Leche entera Carrefour');
    expect(second?.barcode).toBe('3560070976453');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null for a 404 without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new OpenFoodFactsClient(clientConfig, silentLogger);
    await expect(client.getProduct('12345678')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a retryable failure once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ status: 1, product: rawProduct }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new OpenFoodFactsClient(clientConfig, silentLogger);
    const product = await client.getProduct('3560070976453');

    expect(product?.name).toBe('Leche entera Carrefour');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws a 503 AppError after persistent upstream failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('down', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new OpenFoodFactsClient(clientConfig, silentLogger);

    await expect(client.getProduct('3560070976453')).rejects.toMatchObject({
      name: 'AppError',
      statusCode: 503,
      code: 'UPSTREAM_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps search results, removes duplicates and respects the limit', async () => {
    const other = { ...rawProduct, code: '3017620422003', product_name_es: 'Nutella' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          products: [rawProduct, other, rawProduct, { code: 'bad', product_name: 'X' }],
        }),
      ),
    );

    const client = new OpenFoodFactsClient(clientConfig, silentLogger);
    const results = await client.search('carrefour', 2);

    expect(results).toHaveLength(2);
    expect(results.map((product) => product.barcode)).toEqual([
      '3560070976453',
      '3017620422003',
    ]);
  });

  it('wraps unexpected errors as an AppError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const client = new OpenFoodFactsClient(clientConfig, silentLogger);

    await expect(client.getProduct('3560070976453')).rejects.toBeInstanceOf(AppError);
  });
});
