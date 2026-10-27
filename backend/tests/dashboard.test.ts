import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BARCODES, bearer, createTestContext, TOKENS } from './helpers/test-context.js';

describe('dashboard', () => {
  it('summarises stock and top products for employees without low-stock details', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data.summary).toEqual({
      totalProducts: 2,
      totalUnits: 51,
      lowStockCount: 1,
      outOfStockCount: 0,
      lowStockThreshold: 5,
    });
    expect(response.body.data.lowStock).toBeNull();
    expect(response.body.data.topViewed[0]).toMatchObject({
      barcode: BARCODES.milk,
      stock: { quantity: 48 },
    });
  });

  it('includes the low-stock ranking for supervisors', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', bearer(TOKENS.supervisor));

    expect(response.status).toBe(200);
    expect(response.body.data.lowStock).toHaveLength(1);
    expect(response.body.data.lowStock[0].barcode).toBe(BARCODES.nutella);
    expect(response.body.data.lowStock[0].stock.quantity).toBe(3);
  });
});
