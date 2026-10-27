import type { Logger } from '../../core/logger.js';
import type { ProductRepository, StockRepository } from '../../core/ports.js';
import type { LowStockItem, Stock } from '../../core/types.js';
import { placeholderProduct } from '../products/product.utils.js';

interface StockServiceDependencies {
  stock: StockRepository;
  products: ProductRepository;
  logger: Logger;
}

export class StockService {
  constructor(private readonly deps: StockServiceDependencies) {}

  /** A missing stock document means "not registered yet", not an error. */
  async get(barcode: string): Promise<Stock> {
    return (
      (await this.deps.stock.findByBarcode(barcode)) ?? {
        barcode,
        quantity: 0,
        updatedAt: null,
      }
    );
  }

  async update(
    barcode: string,
    quantity: number,
    actor: { uid: string; email: string },
  ): Promise<Stock> {
    const previous = await this.deps.stock.findByBarcode(barcode);
    const updated = await this.deps.stock.setQuantity(barcode, quantity);

    this.deps.logger.info(
      {
        barcode,
        quantity,
        previousQuantity: previous?.quantity ?? null,
        actorUid: actor.uid,
        actorEmail: actor.email,
      },
      'Stock updated',
    );

    return updated;
  }

  async listLowStock(threshold: number, limit: number): Promise<LowStockItem[]> {
    const rows = await this.deps.stock.listLowStock(threshold, limit);
    if (rows.length === 0) return [];

    const products = await this.deps.products.findByBarcodes(
      rows.map((row) => row.barcode),
    );
    const productByBarcode = new Map(
      products.map((product) => [product.barcode, product]),
    );

    return rows.map((stock) => ({
      ...(productByBarcode.get(stock.barcode) ?? placeholderProduct(stock.barcode)),
      stock,
    }));
  }
}
