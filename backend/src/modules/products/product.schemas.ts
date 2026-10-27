import { z } from 'zod';

export const barcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{8,14}$/, 'El código de barras debe tener entre 8 y 14 dígitos.');

export const productListQuerySchema = z.object({
  q: z.string().trim().max(80, 'La búsqueda no puede superar los 80 caracteres.').optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const barcodeParamsSchema = z.object({
  barcode: barcodeSchema,
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
