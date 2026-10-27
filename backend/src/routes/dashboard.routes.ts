import { Router } from 'express';
import type { createDashboardController } from '../modules/dashboard/dashboard.controller.js';

export function createDashboardRouter(
  controller: ReturnType<typeof createDashboardController>,
): Router {
  const router = Router();
  router.get('/', controller.get);
  return router;
}
