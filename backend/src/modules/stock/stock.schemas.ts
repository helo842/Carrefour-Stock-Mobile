import { z } from 'zod';
import { barcodeSchema } from '../products/product.schemas.js';

export const stockParamsSchema = z.object({
  barcode: barcodeSchema,
});

export const updateStockBodySchema = z.object({
  // JSON bodies are already typed: do not coerce null/booleans into 0/1.
  quantity: z
    .number({ error: 'La cantidad es obligatoria y debe ser un número.' })
    .int('La cantidad debe ser un número entero.')
    .min(0, 'La cantidad no puede ser negativa.')
    .max(1_000_000, 'La cantidad es demasiado alta.'),
});

export const lowStockQuerySchema = z.object({
  threshold: z.coerce.number().int().min(1).max(100_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
