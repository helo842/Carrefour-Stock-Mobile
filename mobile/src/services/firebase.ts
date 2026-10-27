import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth } from 'firebase/auth';
import { env, isFirebaseConfigured } from '../config/env';

let cachedAuth: Auth | null = null;

type AuthDependencies = Parameters<typeof initializeAuth>[1];
type PersistenceOption = NonNullable<AuthDependencies>['persistence'];

/**
 * `getReactNativePersistence` is exported by the React Native build of the
 * Firebase SDK, but its TypeScript entry point is the web one. Metro resolves
 * the react-native condition at bundle time, so we only need a narrow cast for
 * the compiler.
 */
const { getReactNativePersistence } = firebaseAuth as unknown as {
  getReactNativePersistence: (storage: unknown) => PersistenceOption;
};

function isAlreadyInitialized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'auth/already-initialized'
  );
}

/**
 * Firebase Auth singleton with encrypted-at-rest persistence through
 * AsyncStorage. Only email/password sign-in is enabled for the MVP.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth;

  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase no está configurado. Define EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_PROJECT_ID y EXPO_PUBLIC_FIREBASE_APP_ID.',
    );
  }

  const app = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: env.firebase.apiKey,
        authDomain: env.firebase.authDomain,
        projectId: env.firebase.projectId,
        appId: env.firebase.appId,
      });

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    // Fast Refresh initializes the module again; reuse the existing instance.
    if (!isAlreadyInitialized(error)) throw error;
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
}
