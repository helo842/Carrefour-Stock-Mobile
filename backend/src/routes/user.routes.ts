import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import type { createUserController } from '../modules/users/user.controller.js';

export function createUserRouter(
  controller: ReturnType<typeof createUserController>,
): Router {
  const router = Router();

  router.get('/me', controller.me);
  router.get('/', authorize('admin'), controller.list);
  router.post('/', authorize('admin'), controller.create);
  router.patch('/:uid/role', authorize('admin'), controller.updateRole);

  return router;
}
