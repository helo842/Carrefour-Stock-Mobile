import type {
  ProductRepository,
  StatisticsRepository,
  StockRepository,
} from '../../core/ports.js';
import type { Dashboard, LowStockItem, ProductWithStock, Role } from '../../core/types.js';
import { ROLE_RANK } from '../../core/types.js';
import { placeholderProduct } from '../products/product.utils.js';

interface DashboardServiceDependencies {
  products: ProductRepository;
  stock: StockRepository;
  statistics: StatisticsRepository;
  lowStockThreshold: number;
}

export class DashboardService {
  constructor(private readonly deps: DashboardServiceDependencies) {}

  async get(role: Role): Promise<Dashboard> {
    const threshold = this.deps.lowStockThreshold;

    const [summary, topViewedEntries, lowStockRows] = await Promise.all([
      this.deps.stock.getSummary(threshold),
      this.deps.statistics.topViewed(5),
      ROLE_RANK[role] >= ROLE_RANK.supervisor
        ? this.deps.stock.listLowStock(threshold, 5)
        : Promise.resolve([]),
    ]);

    const referencedBarcodes = new Set<string>([
      ...topViewedEntries.map((entry) => entry.barcode),
      ...lowStockRows.map((row) => row.barcode),
    ]);

    const [products, stocks] = await Promise.all([
      this.deps.products.findByBarcodes([...referencedBarcodes]),
      this.deps.stock.findByBarcodes([...referencedBarcodes]),
    ]);

    const productByBarcode = new Map(
      products.map((product) => [product.barcode, product]),
    );
    const stockByBarcode = new Map(stocks.map((stock) => [stock.barcode, stock]));

    const topViewed: ProductWithStock[] = topViewedEntries.map((entry) => ({
      ...(productByBarcode.get(entry.barcode) ?? placeholderProduct(entry.barcode)),
      stock: stockByBarcode.get(entry.barcode) ?? null,
    }));

    let lowStock: LowStockItem[] | null = null;
    if (ROLE_RANK[role] >= ROLE_RANK.supervisor) {
      lowStock = lowStockRows.map((stock) => ({
        ...(productByBarcode.get(stock.barcode) ?? placeholderProduct(stock.barcode)),
        stock,
      }));
    }

    return {
      summary: {
        ...summary,
        lowStockThreshold: threshold,
      },
      topViewed,
      lowStock,
    };
  }
}
