import type { App } from 'firebase-admin/app';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import type { AppConfig } from './env.js';

export interface FirebaseContext {
  app: App;
  auth: Auth;
  db: Firestore;
}

interface ServiceAccountLike {
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function parseServiceAccount(raw: string): ServiceAccountLike {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido. Debe ser el JSON completo de la cuenta de servicio en una sola línea.',
    );
  }

  const account = parsed as ServiceAccountLike;
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON no contiene project_id, client_email y private_key.',
    );
  }
  return account;
}

/**
 * Firestore and Firebase Auth are accessed exclusively through the Admin SDK.
 * In Cloud Run / GKE the default service account is used; elsewhere provide
 * FIREBASE_SERVICE_ACCOUNT_JSON (never commit it).
 */
export function initFirebase(config: AppConfig): FirebaseContext {
  const existing = getApps()[0];
  if (existing) {
    return { app: existing, auth: getAuth(existing), db: getFirestore(existing) };
  }

  const credential = config.firebase.serviceAccountJson
    ? cert(parseServiceAccount(config.firebase.serviceAccountJson) as never)
    : applicationDefault();

  const app = initializeApp({
    credential,
    ...(config.firebase.projectId ? { projectId: config.firebase.projectId } : {}),
  });

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  return { app, auth: getAuth(app), db };
}
