import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { BARCODES, bearer, createTestContext, TOKENS } from './helpers/test-context.js';

const PREFIX = '/api/v1/stock';

describe('stock', () => {
  it('returns the stock of a barcode', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      barcode: BARCODES.milk,
      quantity: 48,
    });
  });

  it('returns zero for a barcode without a stock document', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/12345678`)
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data.quantity).toBe(0);
    expect(response.body.data.updatedAt).toBeNull();
  });

  it('lets supervisors list low-stock products', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/low-stock`)
      .set('Authorization', bearer(TOKENS.supervisor));

    expect(response.status).toBe(200);
    expect(response.body.meta.threshold).toBe(5);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      barcode: BARCODES.nutella,
      name: 'Crema de cacao Nutella',
      stock: { quantity: 3 },
    });
  });

  it('accepts a custom low-stock threshold', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get(`${PREFIX}/low-stock`)
      .query({ threshold: 100 })
      .set('Authorization', bearer(TOKENS.supervisor));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });

  it('lets an admin update the stock', async () => {
    const { app, stock } = createTestContext();
    const response = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: 120 });

    expect(response.status).toBe(200);
    expect(response.body.data.quantity).toBe(120);
    expect(stock.stock.get(BARCODES.milk)?.quantity).toBe(120);
  });

  it('allows creating stock for a barcode not yet tracked', async () => {
    const { app, stock } = createTestContext();
    const response = await request(app)
      .put(`${PREFIX}/12345678`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: 9 });

    expect(response.status).toBe(200);
    expect(stock.stock.get('12345678')?.quantity).toBe(9);
  });

  it('forbids employees and supervisors from updating stock', async () => {
    const { app } = createTestContext();

    const employeeResponse = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.employee))
      .send({ quantity: 1 });

    const supervisorResponse = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.supervisor))
      .send({ quantity: 1 });

    expect(employeeResponse.status).toBe(403);
    expect(supervisorResponse.status).toBe(403);
  });

  it('rejects negative and fractional quantities', async () => {
    const { app } = createTestContext();

    const negative = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: -5 });

    const fractional = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: 2.5 });

    expect(negative.status).toBe(400);
    expect(fractional.status).toBe(400);
    expect(negative.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not coerce null or strings into a quantity', async () => {
    const { app, stock } = createTestContext();

    const nullQuantity = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: null });

    const stringQuantity = await request(app)
      .put(`${PREFIX}/${BARCODES.milk}`)
      .set('Authorization', bearer(TOKENS.admin))
      .send({ quantity: '5' });

    expect(nullQuantity.status).toBe(400);
    expect(stringQuantity.status).toBe(400);
    expect(stock.stock.get(BARCODES.milk)?.quantity).toBe(48);
  });
});
