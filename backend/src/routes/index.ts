import { Router, type RequestHandler } from 'express';
import type { createDashboardController } from '../modules/dashboard/dashboard.controller.js';
import type { createProductController } from '../modules/products/product.controller.js';
import type { createStockController } from '../modules/stock/stock.controller.js';
import type { createUserController } from '../modules/users/user.controller.js';
import { createDashboardRouter } from './dashboard.routes.js';
import { createProductRouter } from './product.routes.js';
import { createStockRouter } from './stock.routes.js';
import { createUserRouter } from './user.routes.js';

export interface ApiRouterDependencies {
  authenticate: RequestHandler;
  products: ReturnType<typeof createProductController>;
  stock: ReturnType<typeof createStockController>;
  dashboard: ReturnType<typeof createDashboardController>;
  users: ReturnType<typeof createUserController>;
}

export function createApiRouter(deps: ApiRouterDependencies): Router {
  const router = Router();

  router.use(deps.authenticate);
  router.use('/products', createProductRouter(deps.products));
  router.use('/stock', createStockRouter(deps.stock));
  router.use('/dashboard', createDashboardRouter(deps.dashboard));
  router.use('/users', createUserRouter(deps.users));

  return router;
}
