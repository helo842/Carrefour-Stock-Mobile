# 10 · Referencia de API

## 1. Convenciones

- **Base:** `https://<host>/api/v1` (salvo salud).
- **Formato:** JSON UTF-8; fechas ISO 8601 UTC; importes/cantidades numéricos.
- **Autenticación:** `Authorization: Bearer <Firebase ID token>`.
- **Request id:** se acepta `X-Request-Id` (8–128 caracteres seguros) o se genera; se devuelve
  en la respuesta y en los errores.
- **Rate limit:** 300 peticiones/minuto por IP (configurable); al superarlo, `429` con
  `RATE_LIMITED`.
- **CORS:** los clientes nativos no envían `Origin`; los navegadores deben estar en
  `CORS_ORIGINS`.

### Envelope de éxito

```json
{ "data": { }, "meta": { "count": 1 } }
```

`meta` solo aparece en listados (y en cada caso se documenta).

### Envelope de error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son válidos.",
    "details": [{ "field": "quantity", "message": "La cantidad no puede ser negativa." }],
    "requestId": "2f1c..."
  }
}
```

`code` es estable; `message` puede cambiar. `details` es opcional.

### Obtener un ID token para pruebas manuales

```bash
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@carrefour.com","password":"...","returnSecureToken":true}' \
  | jq -r .idToken)
```

El token caduca en ~1 h. No lo pegues en tickets ni logs.

## 2. Salud

### `GET /health`

Sin autenticación. Liveness.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptimeSeconds": 431,
  "timestamp": "2026-10-26T09:30:00.000Z"
}
```

### `GET /ready`

Sin autenticación. Comprueba Firestore. `200 { "status": "ready" }` o
`503 { "status": "not_ready" }`.

## 3. Productos

### `GET /api/v1/products`

Rol mínimo: **employee**.

| Query | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `q` | string ≤ 80 | no | Búsqueda por nombre/marca o código exacto |
| `limit` | int 1–50 | no (20) | Tamaño de página |

Comportamiento:

- Sin `q`: productos consultados recientemente (`products.updatedAt` desc).
- `q` numérico de 8–14 dígitos: busca ese barcode (catálogo local → OpenFoodFacts).
- `q` de texto: coincidencias locales por prefijo + OpenFoodFacts; se cachean en `products`.
- Si OpenFoodFacts falla pero hay coincidencias locales, responde `200` con ellas.
- Si falla y no hay locales, `503 UPSTREAM_UNAVAILABLE`.

Respuesta:

```json
{
  "data": [
    {
      "barcode": "3560070976453",
      "name": "Leche entera Carrefour",
      "imageUrl": "https://images.openfoodfacts.org/...",
      "brand": "Carrefour",
      "category": "Lácteos",
      "quantityLabel": "1 L",
      "updatedAt": "2026-10-26T09:12:00.000Z",
      "stock": {
        "barcode": "3560070976453",
        "quantity": 48,
        "updatedAt": "2026-10-26T09:15:00.000Z"
      }
    }
  ],
  "meta": { "count": 1 }
}
```

`stock` es `null` si el producto no tiene documento de stock.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/products?q=leche&limit=20"
```

### `GET /api/v1/products/:barcode`

Rol mínimo: **employee**. `barcode` = 8–14 dígitos.

- Devuelve producto + stock y **registra una vista** (best-effort).
- Cachea el producto si venía de OpenFoodFacts.
- `400 VALIDATION_ERROR` si el formato es inválido.
- `404 PRODUCT_NOT_FOUND` si no existe en la caché ni en OpenFoodFacts.
- `503 UPSTREAM_UNAVAILABLE` si OpenFoodFacts falla y no está cacheado.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$API/api/v1/products/3560070976453"
```

## 4. Stock

### `GET /api/v1/stock/:barcode`

Rol mínimo: **employee**. Devuelve el stock; si no hay documento devuelve cero (no es un
error):

```json
{ "data": { "barcode": "12345678", "quantity": 0, "updatedAt": null } }
```

### `GET /api/v1/stock/low-stock`

Rol mínimo: **supervisor**.

| Query | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `threshold` | int 1–100000 | no | Umbral; por defecto `LOW_STOCK_THRESHOLD` |
| `limit` | int 1–100 | no (20) | Máximo de resultados |

Ordenado por cantidad ascendente. Incluye productos sin catalogar con nombre
`Producto <barcode>`.

```json
{
  "data": [
    {
      "barcode": "3017620422003",
      "name": "Crema de cacao Nutella",
      "brand": "Ferrero",
      "category": "Desayuno",
      "imageUrl": null,
      "quantityLabel": "400 g",
      "updatedAt": "2026-10-26T09:12:00.000Z",
      "stock": {
        "barcode": "3017620422003",
        "quantity": 3,
        "updatedAt": "2026-10-26T09:15:00.000Z"
      }
    }
  ],
  "meta": { "count": 1, "threshold": 10 }
}
```

### `PUT /api/v1/stock/:barcode`

Rol mínimo: **admin**. Fija la cantidad (operación idempotente).

```json
{ "quantity": 120 }
```

- Entero entre 0 y 1 000 000.
- Crea el documento si no existía; `updatedAt` se genera en servidor.
- Registra en logs actor, email, cantidad anterior y nueva.
- `400 VALIDATION_ERROR` si no es entero o es negativo.
- `403 INSUFFICIENT_ROLE` para employee/supervisor.

```json
{
  "data": {
    "barcode": "3560070976453",
    "quantity": 120,
    "updatedAt": "2026-10-26T10:02:11.000Z"
  }
}
```

```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"quantity":120}' \
  "$API/api/v1/stock/3560070976453"
```

## 5. Dashboard

### `GET /api/v1/dashboard`

Rol mínimo: **employee**.

```json
{
  "data": {
    "summary": {
      "totalProducts": 128,
      "totalUnits": 2431,
      "lowStockCount": 7,
      "outOfStockCount": 2,
      "lowStockThreshold": 10
    },
    "topViewed": [ { "barcode": "...", "name": "...", "stock": { "quantity": 48 } } ],
    "lowStock": null
  }
}
```

- `lowStock` es `null` para employees y un array (máximo 5) para supervisor/admin.
- `topViewed` son los 5 más consultados, con su stock.
- Los agregados se calculan con `count()`/`sum()` de Firestore.

## 6. Usuarios

### `GET /api/v1/users/me`

Rol mínimo: **employee**. Devuelve el perfil del token.

```json
{
  "data": {
    "uid": "8f3k...",
    "name": "Ana Admin",
    "email": "ana@carrefour.com",
    "role": "admin",
    "createdAt": "2026-10-20T08:00:00.000Z",
    "updatedAt": "2026-10-25T18:30:00.000Z"
  }
}
```

Si el usuario no está dado de alta: `403 USER_NOT_PROVISIONED` (la app cierra sesión).

### `GET /api/v1/users`

Rol mínimo: **admin**. Hasta 500 usuarios ordenados por nombre.

```json
{ "data": [ { "uid": "...", "name": "...", "email": "...", "role": "employee" } ], "meta": { "count": 3 } }
```

### `POST /api/v1/users`

Rol mínimo: **admin**. Crea la cuenta en Firebase Auth + perfil en Firestore.

```json
{
  "name": "Elena Empleada",
  "email": "elena@carrefour.com",
  "role": "employee"
}
```

- `name`: 2–80 caracteres.
- `email`: válido; se normaliza a minúsculas.
- `role`: `employee` (por defecto), `supervisor` o `admin`.
- `201` con el perfil y `passwordResetLink` (puede ser `null` si Firebase no pudo generarlo).
  La contraseña temporal nunca se devuelve.
- `409 EMAIL_IN_USE` si ya existe.
- Si falla la escritura en Firestore, se elimina la cuenta de Auth (compensación).

```json
{
  "data": {
    "profile": { "uid": "new-uid", "name": "Elena Empleada", "email": "elena@carrefour.com", "role": "employee" },
    "passwordResetLink": "https://carrefour-stock.firebaseapp.com/__/auth/action?mode=resetPassword&..."
  }
}
```

### `PATCH /api/v1/users/:uid/role`

Rol mínimo: **admin**.

```json
{ "role": "supervisor" }
```

- `200` con el perfil actualizado.
- `404 USER_NOT_FOUND`.
- `409 CANNOT_DEMOTE_SELF` si el admin intenta quitarse el rol.
- `409 LAST_ADMIN` si dejaría la aplicación sin administradores.
- `400 VALIDATION_ERROR` si el rol no es válido.
- El cambio se aplica en la siguiente petición del usuario (el rol se lee de Firestore).

## 7. Códigos de error

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Body/query/params inválidos; incluye `details` |
| 400 | `INVALID_JSON` | JSON malformado |
| 400 | `BAD_REQUEST` | Petición semánticamente inválida |
| 401 | `UNAUTHORIZED` | Sin token, token inválido o caducado |
| 403 | `USER_NOT_PROVISIONED` | Existe en Auth, no en `users` |
| 403 | `INSUFFICIENT_ROLE` | Rol inferior al requerido |
| 404 | `PRODUCT_NOT_FOUND` | Barcode no encontrado |
| 404 | `USER_NOT_FOUND` | UID no encontrado |
| 404 | `ROUTE_NOT_FOUND` | Ruta inexistente |
| 409 | `EMAIL_IN_USE` | Email ya registrado |
| 409 | `CANNOT_DEMOTE_SELF` | Admin intenta quitarse el rol |
| 409 | `LAST_ADMIN` | Quedaría sin administradores |
| 429 | `RATE_LIMITED` | Límite de peticiones superado |
| 500 | `INTERNAL_ERROR` | Error inesperado (con `requestId`) |
| 503 | `UPSTREAM_UNAVAILABLE` | OpenFoodFacts no disponible |

## 8. Límites y evolución

- Listados con topes: productos 50, low-stock 100, usuarios 500.
- Paginación por cursor (`startAfter`) prevista para catálogo y usuarios.
- `/api/v1` es la versión actual; un cambio incompatible abre `/api/v2`.
- Sin endpoints de borrado de usuarios en el MVP.
