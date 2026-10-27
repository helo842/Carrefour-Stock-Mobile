# 02 · Estructura de carpetas

## 1. Vista general

```
Proyecto-Carrefour/
├── backend/                     API REST (Express + Firebase Admin)
│   ├── src/
│   │   ├── app.ts               Factory de Express + inyección de dependencias
│   │   ├── server.ts            Arranque, señales, graceful shutdown
│   │   ├── config/
│   │   │   ├── env.ts           Validación Zod de variables de entorno
│   │   │   └── firebase.ts      Inicialización del Admin SDK
│   │   ├── core/
│   │   │   ├── types.ts         Dominio: Role, Product, Stock, Dashboard…
│   │   │   ├── ports.ts         Interfaces de repositorios e integraciones
│   │   │   ├── errors.ts        AppError + factories (400/401/403/404/409/503)
│   │   │   ├── validation.ts    parseInput(schema, input) → AppError
│   │   │   ├── cache.ts         TTL + LRU acotada
│   │   │   ├── date.ts          ISO / Timestamp helpers
│   │   │   └── logger.ts        Pino con redacción de secretos
│   │   ├── middleware/
│   │   │   ├── authenticate.ts  Bearer token → perfil + rol
│   │   │   ├── authorize.ts     Jerarquía employee < supervisor < admin
│   │   │   ├── request-context.ts
│   │   │   └── error-handler.ts Envelope único + 404 + JSON inválido
│   │   ├── modules/
│   │   │   ├── products/        schemas · controller · service · utils
│   │   │   ├── stock/           schemas · controller · service
│   │   │   ├── dashboard/       controller · service
│   │   │   └── users/           schemas · controller · service
│   │   ├── routes/              Routers por recurso + composición /api/v1
│   │   ├── infrastructure/
│   │   │   ├── firestore/       Repositorios Firestore + helpers de campos
│   │   │   └── firebase/        TokenVerifier, IdentityAdmin, readiness
│   │   ├── integrations/
│   │   │   └── openfoodfacts/   Cliente HTTP, mapper, tipos
│   │   ├── scripts/
│   │   │   ├── seed.ts          Datos de demo (bloqueado en production)
│   │   │   └── bootstrap-admin.ts Primer administrador
│   │   └── types/express.d.ts   requestId + user en Request
│   ├── tests/
│   │   ├── helpers/             Repos en memoria, catálogo y Auth falsos
│   │   ├── auth.test.ts
│   │   ├── products.test.ts
│   │   ├── stock.test.ts
│   │   ├── dashboard.test.ts
│   │   ├── users.test.ts
│   │   └── health.test.ts
│   ├── Dockerfile
│   ├── .env.example
│   ├── eslint.config.js
│   ├── vitest.config.ts
│   ├── tsconfig.json
│   └── tsconfig.build.json
│
├── mobile/                      App Expo / React Native
│   ├── App.tsx                  Providers raíz + guard de configuración
│   ├── index.ts                 registerRootComponent
│   ├── app.json                 Nombre, package Android, iconos, plugins
│   ├── eas.json                 Perfiles development / preview / production
│   ├── eslint.config.js
│   ├── src/
│   │   ├── api/                 client.ts, products, stock, dashboard, users, errors
│   │   ├── components/          AppButton, AppTextInput, ProductCard, SearchBar…
│   │   ├── config/env.ts        EXPO_PUBLIC_* con acceso estático
│   │   ├── hooks/               useDebouncedValue
│   │   ├── navigation/          Root, tabs por rol, stacks y tipos
│   │   ├── screens/             12 pantallas (login, lista, detalle, dashboard…)
│   │   ├── services/            firebase.ts, auth.ts (Firebase Auth)
│   │   ├── store/               auth.store, product.store, dashboard.store
│   │   ├── theme/               Tokens de diseño
│   │   ├── types/api.ts         DTOs espejo del backend
│   │   └── utils/               roles.ts, format.ts
│   ├── assets/                  Iconos y splash (sustituir por branding oficial)
│   └── .env.example
│
├── firebase/
│   ├── firestore.rules          Deny-all para clientes
│   └── firestore.indexes.json   Índices (ninguno compuesto en el MVP)
├── docs/                        Documentación funcional y técnica
├── .github/workflows/ci.yml
├── docker-compose.yml
├── firebase.json
├── .editorconfig
├── .nvmrc
└── README.md
```

## 2. Convenciones de nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Archivos TypeScript | kebab-case con sufijo de rol | `firestore-stock.repository.ts` |
| Clases y tipos | PascalCase | `ProductService`, `StockRepository` |
| Funciones y variables | camelCase | `createApp`, `lowStockThreshold` |
| Constantes | UPPER_SNAKE_CASE | `ROLE_RANK`, `MAX_USERS` |
| Endpoints | kebab-case, plural | `/users`, `/stock/low-stock` |
| Colecciones Firestore | plural, minúsculas | `users`, `products`, `statistics` |
| Pantallas | PascalCase + `Screen` | `StockManagementScreen` |
| Stores | `*.store.ts` + hook `useXStore` | `useAuthStore` |

## 3. Regla de dependencias

- `screens` pueden importar `components`, `store`, `api`, `utils`, `theme`.
- `components` **no** importan `store` ni `api`; reciben props.
- `store` importa `api` y `services`, nunca `screens`.
- `services/firebase` no importa nada de `api` (evita ciclos).
- Backend: `services` dependen de `core/ports`; **nunca** de `infrastructure` o de Express.
- `routes` no contienen lógica de negocio.

Esta dirección evita dependencias circulares y permite testear cada capa por separado.

## 4. Dónde añadir código nuevo

| Necesidad | Ubicación |
| --- | --- |
| Nuevo endpoint | `backend/src/modules/<dominio>/` + router + test |
| Nueva colección | Puerto en `core/ports.ts`, repo en `infrastructure/firestore/` |
| Nueva pantalla | `mobile/src/screens/`, registro en el stack y tipo de params |
| Nueva pestaña | `mobile/src/navigation/AppTabs.tsx` + guard de rol |
| Nuevo permiso | `ROLE_RANK`/guardas backend + `utils/roles.ts` en móvil |
| Nuevo token de diseño | `mobile/src/theme/index.ts` (sin colores hardcodeados) |
