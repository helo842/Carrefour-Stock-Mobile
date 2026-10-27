import type { ApiResponse, ProductWithStock } from '../types/api';
import { http } from './client';
import { ApiError } from './errors';

export interface ProductQuery {
  q?: string;
  limit?: number;
}

export async function fetchProducts(query: ProductQuery = {}): Promise<ProductWithStock[]> {
  const response = await http.get<ApiResponse<ProductWithStock[]>>('/products', {
    params: query,
  });
  return response.data.data;
}

export async function fetchProduct(barcode: string): Promise<ProductWithStock> {
  const response = await http.get<ApiResponse<ProductWithStock>>(`/products/${barcode}`);
  return response.data.data;
}

export async function searchByBarcode(barcode: string): Promise<ProductWithStock | null> {
  try {
    return await fetchProduct(barcode);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
