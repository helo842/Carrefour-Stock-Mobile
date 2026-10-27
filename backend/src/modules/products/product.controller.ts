import type { RequestHandler } from 'express';
import { parseInput } from '../../core/validation.js';
import {
  barcodeParamsSchema,
  productListQuerySchema,
} from './product.schemas.js';
import type { ProductService } from './product.service.js';

export function createProductController(service: ProductService): {
  list: RequestHandler;
  getByBarcode: RequestHandler;
} {
  return {
    list: async (req, res) => {
      const query = parseInput(productListQuerySchema, req.query);
      const items = await service.list(query);
      res.status(200).json({ data: items, meta: { count: items.length } });
    },

    getByBarcode: async (req, res) => {
      const { barcode } = parseInput(barcodeParamsSchema, req.params);
      const product = await service.getByBarcode(barcode);
      res.status(200).json({ data: product });
    },
  };
}
