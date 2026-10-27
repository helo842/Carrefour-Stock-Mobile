import { Router } from 'express';
import type { createProductController } from '../modules/products/product.controller.js';

export function createProductRouter(
  controller: ReturnType<typeof createProductController>,
): Router {
  const router = Router();
  router.get('/', controller.list);
  router.get('/:barcode', controller.getByBarcode);
  return router;
}
