import type { Firestore } from 'firebase-admin/firestore';

/**
 * Lightweight connectivity probe for container readiness checks. It does not
 * validate schema, only that the Admin SDK can reach Firestore.
 */
export function createFirestoreReadiness(
  db: Firestore,
): () => Promise<boolean> {
  return async () => {
    await db.collection('users').limit(1).get();
    return true;
  };
}
