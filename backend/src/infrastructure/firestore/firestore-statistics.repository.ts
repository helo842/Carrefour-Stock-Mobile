import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { StatisticsRepository } from '../../core/ports.js';
import type { StatisticsEntry } from '../../core/types.js';
import { readNumber } from './fields.js';

const COLLECTION = 'statistics';

export class FirestoreStatisticsRepository implements StatisticsRepository {
  private readonly collection;

  constructor(db: Firestore) {
    this.collection = db.collection(COLLECTION);
  }

  async registerView(barcode: string): Promise<void> {
    await this.collection.doc(barcode).set(
      {
        barcode,
        views: FieldValue.increment(1),
      },
      { merge: true },
    );
  }

  async topViewed(limit: number): Promise<StatisticsEntry[]> {
    const snapshot = await this.collection
      .orderBy('views', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      barcode: doc.id,
      views: readNumber(doc.data(), 'views', 0),
    }));
  }
}
