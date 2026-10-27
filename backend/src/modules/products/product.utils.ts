import type { Product, ProductWithStock, Stock } from '../../core/types.js';

export function placeholderProduct(barcode: string): Product {
  return {
    barcode,
    name: `Producto ${barcode}`,
    imageUrl: null,
    brand: null,
    category: null,
    quantityLabel: null,
    updatedAt: null,
  };
}

export function joinProductsWithStock(
  products: Product[],
  stocks: Stock[],
): ProductWithStock[] {
  const stockByBarcode = new Map(stocks.map((stock) => [stock.barcode, stock]));
  return products.map((product) => ({
    ...product,
    stock: stockByBarcode.get(product.barcode) ?? null,
  }));
}
