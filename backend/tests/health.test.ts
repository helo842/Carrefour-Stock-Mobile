import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, createTestContext, TOKENS } from './helpers/test-context.js';

describe('infrastructure endpoints', () => {
  it('exposes a liveness endpoint without authentication', async () => {
    const { app } = createTestContext();
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptimeSeconds).toBe('number');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('exposes a readiness endpoint', async () => {
    const { app } = createTestContext();
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });

  it('returns 503 when a dependency is not ready', async () => {
    const { app } = createTestContext({
      readiness: async () => false,
    });
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('not_ready');
  });

  it('keeps the error envelope for unknown routes', async () => {
    const { app } = createTestContext();
    const response = await request(app).get('/api/v1/does-not-exist').set(
      'Authorization',
      bearer(TOKENS.admin),
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('rejects malformed JSON with a 400 instead of a 500', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .put('/api/v1/stock/3560070976453')
      .set('Authorization', bearer(TOKENS.admin))
      .set('Content-Type', 'application/json')
      .send('{"quantity":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('echoes a safe incoming request id', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/health')
      .set('x-request-id', 'req-abc-123456');

    expect(response.headers['x-request-id']).toBe('req-abc-123456');
  });
});
