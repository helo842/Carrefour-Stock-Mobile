import type { ApiResponse, ProductWithStock, Stock } from '../types/api';
import { http } from './client';

export interface LowStockResult {
  items: ProductWithStock[];
  threshold: number | null;
}

export async function fetchStock(barcode: string): Promise<Stock> {
  const response = await http.get<ApiResponse<Stock>>(`/stock/${barcode}`);
  return response.data.data;
}

export async function updateStock(barcode: string, quantity: number): Promise<Stock> {
  const response = await http.put<ApiResponse<Stock>>(`/stock/${barcode}`, { quantity });
  return response.data.data;
}

export async function fetchLowStock(
  options: { threshold?: number; limit?: number } = {},
): Promise<LowStockResult> {
  const response = await http.get<ApiResponse<ProductWithStock[]>>('/stock/low-stock', {
    params: options,
  });

  const threshold = response.data.meta?.threshold;
  return {
    items: response.data.data,
    threshold: typeof threshold === 'number' ? threshold : null,
  };
}
