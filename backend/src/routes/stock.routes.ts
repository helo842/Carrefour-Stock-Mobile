import { Router } from 'express';
import { authorize } from '../middleware/authorize.js';
import type { createStockController } from '../modules/stock/stock.controller.js';

export function createStockRouter(
  controller: ReturnType<typeof createStockController>,
): Router {
  const router = Router();

  // Declared before "/:barcode" so the literal path is not captured as a barcode.
  router.get('/low-stock', authorize('supervisor'), controller.lowStock);
  router.get('/:barcode', controller.get);
  router.put('/:barcode', authorize('admin'), controller.update);

  return router;
}
