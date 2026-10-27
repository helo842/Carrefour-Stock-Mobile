import type { RequestHandler } from 'express';
import { unauthorized } from '../../core/errors.js';
import { parseInput } from '../../core/validation.js';
import {
  lowStockQuerySchema,
  stockParamsSchema,
  updateStockBodySchema,
} from './stock.schemas.js';
import type { StockService } from './stock.service.js';

export function createStockController(
  service: StockService,
  defaultThreshold: number,
): {
  get: RequestHandler;
  update: RequestHandler;
  lowStock: RequestHandler;
} {
  return {
    get: async (req, res) => {
      const { barcode } = parseInput(stockParamsSchema, req.params);
      const stock = await service.get(barcode);
      res.status(200).json({ data: stock });
    },

    update: async (req, res) => {
      if (!req.user) throw unauthorized();
      const { barcode } = parseInput(stockParamsSchema, req.params);
      const { quantity } = parseInput(updateStockBodySchema, req.body);
      const stock = await service.update(barcode, quantity, req.user);
      res.status(200).json({ data: stock });
    },

    lowStock: async (req, res) => {
      const query = parseInput(lowStockQuerySchema, req.query);
      const threshold = query.threshold ?? defaultThreshold;
      const items = await service.listLowStock(threshold, query.limit);
      res.status(200).json({
        data: items,
        meta: { count: items.length, threshold },
      });
    },
  };
}
