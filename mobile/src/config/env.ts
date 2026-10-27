function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Expo inlines EXPO_PUBLIC_* variables at build time, so each variable must be
 * accessed statically. Android emulators reach the host through 10.0.2.2; use
 * your LAN IP on a physical device.
 */
export const env = {
  apiUrl: stripTrailingSlash(
    process.env.EXPO_PUBLIC_API_URL?.trim() || 'http://10.0.2.2:8080',
  ),
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim() ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim() ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim() ?? '',
  },
  appName: 'Carrefour Stock Mobile',
};

export const isFirebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.projectId && env.firebase.appId,
);
