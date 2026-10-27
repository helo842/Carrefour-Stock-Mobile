/**
 * Provisions the first administrator (or repairs one) without the API.
 *
 * Usage:
 *   npm run bootstrap-admin -- --email admin@empresa.com --name "Admin Carrefour"
 *
 * If the Auth user does not exist it is created with a random password and a
 * password-reset link is printed once. Requires Firebase Admin credentials.
 */
import { randomBytes } from 'node:crypto';
import { deleteApp } from 'firebase-admin/app';
import { FieldValue } from 'firebase-admin/firestore';
import { loadConfig } from '../config/env.js';
import { initFirebase } from '../config/firebase.js';
import { nowIso } from '../core/date.js';

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : undefined;
}

function isFirebaseError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

async function main(): Promise<void> {
  const email = readArg('email')?.trim().toLowerCase();
  const name = readArg('name')?.trim() ?? 'Administrador';

  if (!email) {
    throw new Error('Falta --email. Ejemplo: --email admin@empresa.com --name "Admin"');
  }

  const config = loadConfig();
  const { auth, db, app } = initFirebase(config);

  let uid: string;
  let resetLink: string | null = null;

  try {
    const user = await auth.getUserByEmail(email);
    uid = user.uid;
    console.log(`Usuario existente en Firebase Auth: ${uid}`);
  } catch (error) {
    if (!isFirebaseError(error) || error.code !== 'auth/user-not-found') throw error;

    const temporaryPassword = randomBytes(24).toString('base64url');
    const created = await auth.createUser({
      email,
      displayName: name,
      password: temporaryPassword,
      emailVerified: false,
    });
    uid = created.uid;
    console.log(`Usuario creado en Firebase Auth: ${uid}`);
  }

  await db.collection('users').doc(uid).set(
    {
      uid,
      name,
      email,
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  try {
    resetLink = await auth.generatePasswordResetLink(email);
  } catch (error) {
    console.warn('No se pudo generar el enlace de restablecimiento:', error);
  }

  console.log(`Perfil Firestore actualizado: users/${uid} (rol admin) a las ${nowIso()}`);
  if (resetLink) {
    console.log('\nEnlace de acceso (un solo uso):');
    console.log(resetLink);
  }

  await deleteApp(app);
}

main().catch((error: unknown) => {
  console.error('Bootstrap falló:', error);
  process.exit(1);
});
