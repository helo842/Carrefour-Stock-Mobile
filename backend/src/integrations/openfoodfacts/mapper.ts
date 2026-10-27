import type { Product } from '../../core/types.js';

type RawRecord = Record<string, unknown>;

const BARCODE_PATTERN = /^\d{8,14}$/;

function asRecord(value: unknown): RawRecord | null {
  return typeof value === 'object' && value !== null ? (value as RawRecord) : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function firstListValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const first = value
    .split(',')
    .map((item) => item.trim())
    .find((item) => item.length > 0);
  return first ?? null;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function normaliseImageUrl(value: string | null): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return null;
  return value.replace(/^http:\/\//i, 'https://');
}

/**
 * Maps an OpenFoodFacts product into our catalog shape. Returns null when the
 * record cannot be displayed (no barcode or no name), so callers can skip it
 * instead of storing unusable rows.
 */
export function mapOpenFoodFactsProduct(
  raw: unknown,
  barcodeFallback?: string,
): Product | null {
  const record = asRecord(raw);
  if (!record) return null;

  const barcode = firstString(
    record.code,
    record._id,
    barcodeFallback,
  )?.replace(/\D/g, '');

  if (!barcode || !BARCODE_PATTERN.test(barcode)) return null;

  const name = firstString(
    record.product_name_es,
    record.product_name,
    record.generic_name_es,
    record.generic_name,
  );

  if (!name) return null;

  return {
    barcode,
    name: truncate(name, 200),
    imageUrl: normaliseImageUrl(
      firstString(record.image_front_url, record.image_url, record.image_small_url),
    ),
    brand: firstListValue(record.brands),
    category: firstListValue(record.categories),
    quantityLabel: firstString(record.quantity),
    updatedAt: null,
  };
}
