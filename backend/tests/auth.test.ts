import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, createTestContext, TOKENS } from './helpers/test-context.js';

describe('authentication', () => {
  it('rejects requests without a token', async () => {
    const { app } = createTestContext();
    const response = await request(app).get('/api/v1/products');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects unknown or expired tokens', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/products')
      .set('Authorization', bearer('expired-token'));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a valid Firebase user without a provisioned profile', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/products')
      .set('Authorization', bearer(TOKENS.unprovisioned));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('USER_NOT_PROVISIONED');
  });

  it('allows an employee to read products', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/products')
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });

  it('hides supervisor-only endpoints from employees', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/stock/low-stock')
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INSUFFICIENT_ROLE');
  });

  it('hides admin-only endpoints from supervisors', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer(TOKENS.supervisor));

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('INSUFFICIENT_ROLE');
  });
});
