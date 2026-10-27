import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { AggregateField, FieldValue } from 'firebase-admin/firestore';
import { nowIso, toIsoString } from '../../core/date.js';
import type { StockRepository } from '../../core/ports.js';
import type { Stock } from '../../core/types.js';
import { readNumber } from './fields.js';

const COLLECTION = 'stock';

function mapStock(barcode: string, data: DocumentData): Stock {
  return {
    barcode,
    quantity: Math.max(0, readNumber(data, 'quantity', 0)),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export class FirestoreStockRepository implements StockRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION);
  }

  async findByBarcode(barcode: string): Promise<Stock | null> {
    const snapshot = await this.collection.doc(barcode).get();
    return snapshot.exists ? mapStock(barcode, snapshot.data() ?? {}) : null;
  }

  async findByBarcodes(barcodes: string[]): Promise<Stock[]> {
    if (barcodes.length === 0) return [];

    const unique = [...new Set(barcodes)];
    const snapshots = await this.db.getAll(
      ...unique.map((barcode) => this.collection.doc(barcode)),
    );

    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => mapStock(snapshot.id, snapshot.data() ?? {}));
  }

  async setQuantity(barcode: string, quantity: number): Promise<Stock> {
    const reference = this.collection.doc(barcode);

    await reference.set(
      {
        barcode,
        quantity,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const snapshot = await reference.get();
    return snapshot.exists
      ? mapStock(barcode, snapshot.data() ?? {})
      : { barcode, quantity, updatedAt: nowIso() };
  }

  async listLowStock(threshold: number, limit: number): Promise<Stock[]> {
    const snapshot = await this.collection
      .where('quantity', '<=', threshold)
      .orderBy('quantity', 'asc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => mapStock(doc.id, doc.data()));
  }

  async getSummary(lowStockThreshold: number): Promise<{
    totalProducts: number;
    totalUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  }> {
    const [aggregateSnapshot, lowStockSnapshot, outOfStockSnapshot] = await Promise.all([
      this.collection
        .aggregate({
          totalProducts: AggregateField.count(),
          totalUnits: AggregateField.sum('quantity'),
        })
        .get(),
      this.collection.where('quantity', '<=', lowStockThreshold).count().get(),
      this.collection.where('quantity', '==', 0).count().get(),
    ]);

    const aggregated = aggregateSnapshot.data() as {
      totalProducts?: number | null;
      totalUnits?: number | null;
    };

    return {
      totalProducts: aggregated.totalProducts ?? 0,
      totalUnits: aggregated.totalUnits ?? 0,
      lowStockCount: lowStockSnapshot.data().count,
      outOfStockCount: outOfStockSnapshot.data().count,
    };
  }
}
