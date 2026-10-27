import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { nowIso, toIsoString } from '../../core/date.js';
import type { ProductRepository } from '../../core/ports.js';
import type { Product } from '../../core/types.js';
import { readNullableString, readString } from './fields.js';

const COLLECTION = 'products';

function mapProduct(barcode: string, data: DocumentData): Product {
  return {
    barcode,
    name: readString(data, 'name', `Producto ${barcode}`),
    imageUrl: readNullableString(data, 'imageUrl'),
    brand: readNullableString(data, 'brand'),
    category: readNullableString(data, 'category'),
    quantityLabel: readNullableString(data, 'quantityLabel'),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export class FirestoreProductRepository implements ProductRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const snapshot = await this.collection.doc(barcode).get();
    return snapshot.exists ? mapProduct(barcode, snapshot.data() ?? {}) : null;
  }

  async findByBarcodes(barcodes: string[]): Promise<Product[]> {
    if (barcodes.length === 0) return [];

    const unique = [...new Set(barcodes)];
    const snapshots = await this.db.getAll(
      ...unique.map((barcode) => this.collection.doc(barcode)),
    );

    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => mapProduct(snapshot.id, snapshot.data() ?? {}));
  }

  async listRecent(limit: number): Promise<Product[]> {
    const snapshot = await this.collection
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();
    return snapshot.docs.map((doc) => mapProduct(doc.id, doc.data()));
  }

  async searchByNamePrefix(term: string, limit: number): Promise<Product[]> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return [];

    const snapshot = await this.collection
      .where('nameLower', '>=', normalized)
      .where('nameLower', '<=', `${normalized}\uf8ff`)
      .orderBy('nameLower')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => mapProduct(doc.id, doc.data()));
  }

  async upsert(product: Omit<Product, 'updatedAt'>): Promise<Product> {
    await this.collection.doc(product.barcode).set(
      {
        barcode: product.barcode,
        name: product.name,
        nameLower: product.name.toLowerCase(),
        imageUrl: product.imageUrl,
        brand: product.brand,
        category: product.category,
        quantityLabel: product.quantityLabel,
        source: 'openfoodfacts',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Avoid a second read on every search result; the server timestamp is
    // approximately "now" and is only used for display/ordering.
    return { ...product, updatedAt: nowIso() };
  }
}
