import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { bearer, createTestContext, TOKENS } from './helpers/test-context.js';

describe('users', () => {
  it('returns the caller profile', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', bearer(TOKENS.employee));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      uid: 'emp-1',
      role: 'employee',
      email: 'elena@carrefour.test',
    });
  });

  it('lets admins list users', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .get('/api/v1/users')
      .set('Authorization', bearer(TOKENS.admin));

    expect(response.status).toBe(200);
    expect(response.body.meta.count).toBe(3);
  });

  it('applies a role change immediately on the next request', async () => {
    const { app } = createTestContext();

    const update = await request(app)
      .patch('/api/v1/users/emp-1/role')
      .set('Authorization', bearer(TOKENS.admin))
      .send({ role: 'supervisor' });

    expect(update.status).toBe(200);
    expect(update.body.data.role).toBe('supervisor');

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', bearer(TOKENS.employee));

    expect(me.body.data.role).toBe('supervisor');
  });

  it('prevents admins from demoting themselves', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .patch('/api/v1/users/admin-1/role')
      .set('Authorization', bearer(TOKENS.admin))
      .send({ role: 'employee' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CANNOT_DEMOTE_SELF');
  });

  it('rejects invalid roles', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .patch('/api/v1/users/emp-1/role')
      .set('Authorization', bearer(TOKENS.admin))
      .send({ role: 'superuser' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('provisions a user and returns a one-time reset link', async () => {
    const { app, users, identity } = createTestContext();
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer(TOKENS.admin))
      .send({ name: 'Nuevo Empleado', email: 'Nuevo@Carrefour.test', role: 'employee' });

    expect(response.status).toBe(201);
    expect(response.body.data.profile).toMatchObject({
      name: 'Nuevo Empleado',
      email: 'nuevo@carrefour.test',
      role: 'employee',
    });
    expect(response.body.data.passwordResetLink).toContain('nuevo%40carrefour.test');
    expect(users.users.size).toBe(4);

    const provisioned = identity.created.get(response.body.data.profile.uid);
    expect(provisioned?.temporaryPassword).toHaveLength(32);
  });

  it('rejects duplicated emails', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer(TOKENS.admin))
      .send({ name: 'Elena Otra', email: 'elena@carrefour.test', role: 'employee' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('does not allow employees to provision users', async () => {
    const { app } = createTestContext();
    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', bearer(TOKENS.employee))
      .send({ name: 'Intruso', email: 'intruso@carrefour.test', role: 'admin' });

    expect(response.status).toBe(403);
  });
});
