import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BARCODES, bearer, createTestContext, TOKENS } from './helpers/test-context.js';

const PREFIX = '/api/v1/products';

describe('product catalog', () => {
  it('lists recent products with their stock', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(PREFIX)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.meta.count).toBe(2);

    const nutella = response.body.data.find(
      (item: { barcode: string }) => item.barcode === BARCODES.nutella,
    );
    expect(nutella.name).toBe('Crema de cacao Nutella');
    expect(nutella.brand).toBe('Ferrero');
    expect(nutella.stock.quantity).toBe(3);
  });

  it('returns the full product detail and records a view', async () => {
    const { app, statistics } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      barcode: BARCODES.milk,
      name: 'Leche entera Carrefour',
      brand: 'Carrefour',
      category: 'Lácteos',
      imageUrl: 'https://img.test/milk.jpg',
      stock: { quantity: 48 },
    });
    expect(statistics.views.get(BARCODES.milk)).toBe(11);
  });

  it('returns 404 for an unknown barcode', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/12345678`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('rejects malformed barcodes', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/not-a-barcode`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('searches OpenFoodFacts and caches the result locally', async () => {
    const { app, products } = createTestContext();
    const response = await request(app)
      .get(PREFIX)
      .query({ q: 'café' })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('Café molido Carrefour');
    expect(products.products.has(BARCODES.catalogOnly)).toBe(true);
  });

  it('resolves a barcode search through the external catalog', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(PREFIX)
      .query({ q: BARCODES.catalogOnly })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data[0].barcode).toBe(BARCODES.catalogOnly);
    expect(response.body.data[0].stock).toBeNull();
  });

  it('fetches and caches a product detail from OpenFoodFacts on first access', async () => {
    const { app, products } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/${BARCODES.catalogOnly}`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Café molido Carrefour');
    expect(products.products.has(BARCODES.catalogOnly)).toBe(true);
  });

  it('returns an empty list when the term matches nothing', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(PREFIX)
      .query({ q: 'producto inexistente xyz' })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('degrades to local results when OpenFoodFacts is unavailable', async () => {
    const { app, catalog } = createTestContext();
    catalog.failOnSearch = true;

    const response = await request(app)
      .get(PREFIX)
      .query({ q: 'Leche' })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data[0].barcode).toBe(BARCODES.milk);
  });

  it('returns 503 when OpenFoodFacts is down and nothing is cached', async () => {
    const { app, catalog } = createTestContext();
    catalog.failOnSearch = true;

    const response = await request(app)
      .get(PREFIX)
      .query({ q: 'Café' })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
  });

  it('validates the page size', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(PREFIX)
      .query({ limit: 500 })
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
