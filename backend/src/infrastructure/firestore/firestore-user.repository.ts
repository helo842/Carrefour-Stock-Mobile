import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { nowIso, toIsoString } from '../../core/date.js';
import type { UserRepository } from '../../core/ports.js';
import { isRole, type Role, type UserProfile } from '../../core/types.js';
import { readString } from './fields.js';

const COLLECTION = 'users';
/** Hard cap for the MVP admin list; cursor pagination is a documented next step. */
const MAX_USERS = 500;

function mapUser(uid: string, data: DocumentData): UserProfile {
  return {
    uid,
    name: readString(data, 'name'),
    email: readString(data, 'email'),
    // An invalid/missing role degrades to the least privileged role.
    role: isRole(data.role) ? data.role : 'employee',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

export class FirestoreUserRepository implements UserRepository {
  private readonly collection;

  constructor(private readonly db: Firestore) {
    this.collection = db.collection(COLLECTION);
  }

  async findById(uid: string): Promise<UserProfile | null> {
    const snapshot = await this.collection.doc(uid).get();
    return snapshot.exists ? mapUser(uid, snapshot.data() ?? {}) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const snapshot = await this.collection
      .where('email', '==', email.trim().toLowerCase())
      .limit(1)
      .get();

    const doc = snapshot.docs[0];
    return doc ? mapUser(doc.id, doc.data()) : null;
  }

  async list(): Promise<UserProfile[]> {
    const snapshot = await this.collection.orderBy('name').limit(MAX_USERS).get();
    return snapshot.docs.map((doc) => mapUser(doc.id, doc.data()));
  }

  async create(input: UserProfile): Promise<UserProfile> {
    await this.collection.doc(input.uid).set({
      name: input.name,
      email: input.email.trim().toLowerCase(),
      role: input.role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const timestamp = nowIso();
    return { ...input, createdAt: timestamp, updatedAt: timestamp };
  }

  async updateRole(uid: string, role: Role): Promise<UserProfile | null> {
    const reference = this.collection.doc(uid);
    const snapshot = await reference.get();
    if (!snapshot.exists) return null;

    await reference.update({
      role,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ...mapUser(uid, snapshot.data() ?? {}),
      role,
      updatedAt: nowIso(),
    };
  }

  async countByRole(role: Role): Promise<number> {
    const snapshot = await this.collection.where('role', '==', role).count().get();
    return snapshot.data().count;
  }

  async delete(uid: string): Promise<void> {
    await this.collection.doc(uid).delete();
  }
}
