# Carrefour Stock Mobile — guía para agentes

App Expo/React Native del monorepo. El backend está en `../backend`.

## Reglas del proyecto

- **Navegación: React Navigation 7** (requisito del cliente). No migrar a Expo Router.
- La app **nunca** accede a Firestore directamente. Todos los datos pasan por la API.
- Los permisos se deciden en el backend; las pestañas ocultas son solo UX.
- Estado global con Zustand; estado de formulario local en la pantalla.
- Estilos con los tokens de `src/theme`; nada de colores hardcodeados.
- Textos de UI en español.

## Comandos

```bash
npm run typecheck
npm run lint
npx expo export --platform android --output-dir /tmp/expo-export
npx expo start
```

Usa `npx expo install <paquete>` para dependencias con código nativo (resuelve la versión
compatible con el SDK). Node 24.

## Estructura

- `src/screens` — pantallas y estados de carga/error/vacío.
- `src/navigation` — `RootNavigator` (sesión), `AppTabs` (rol), stacks y param lists.
- `src/store` — `auth`, `products`, `dashboard`.
- `src/api` — cliente Axios con token y normalización de errores.
- `src/services` — Firebase Auth con persistencia RN.
- `src/components` — UI reutilizable sin acceso a red.

## Variables

`.env` (ignorado) con `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_FIREBASE_*`. Sin ellas la app
muestra `ConfigErrorScreen`; no es un bug. Reinicia con `npx expo start -c` tras cambiarlas.
