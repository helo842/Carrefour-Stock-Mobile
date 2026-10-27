# 03 · Modelo de datos Firestore

## 1. Colecciones

```
users/{uid}
  uid, name, email, role, createdAt, updatedAt

products/{barcode}          ← caché del catálogo (OpenFoodFacts + datos propios)
  barcode, name, nameLower, imageUrl, brand, category,
  quantityLabel, source, updatedAt

stock/{barcode}
  barcode, quantity, updatedAt

statistics/{barcode}
  barcode, views
```

`users`, `stock` y `statistics` son las colecciones del enunciado. `products` se añade como
**caché de catálogo**: sin ella, cada búsqueda golpearía OpenFoodFacts y no se podría unir el
stock con nombre/imagen. `products` no es la fuente de verdad del stock.

### Relaciones

```
users (1) ─── rol ───▶ permisos (lógica de aplicación, no documento)
products (1) ── 1:1 ──▶ stock          (mismo id: barcode)
products (1) ── 1:1 ──▶ statistics     (mismo id: barcode)
```

El id del documento es el código de barras en `products`, `stock` y `statistics`. Eso hace
las lecturas O(1), las escrituras idempotentes y evita índices por barcode.

## 2. Esquema detallado

### `users/{uid}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `uid` | string | sí | UID de Firebase Authentication (duplicado del id) |
| `name` | string | sí | Nombre visible (2–80 caracteres) |
| `email` | string | sí | Email normalizado en minúsculas |
| `role` | `employee \| supervisor \| admin` | sí | Fuente de verdad del rol |
| `createdAt` | timestamp | sí | `serverTimestamp()` al provisionar |
| `updatedAt` | timestamp | sí | Última modificación |

Ejemplo:

```json
{
  "uid": "8f3k...",
  "name": "Ana Admin",
  "email": "ana.admin@carrefour.com",
  "role": "admin",
  "createdAt": "2026-10-26T08:00:00.000Z",
  "updatedAt": "2026-10-26T08:00:00.000Z"
}
```

Reglas: un rol inválido o ausente se interpreta como `employee` al leer (mínimo privilegio).
No se auto-crean perfiles: si el usuario existe en Auth pero no aquí, la API responde
`403 USER_NOT_PROVISIONED`.

### `products/{barcode}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `barcode` | string (8–14 dígitos) | sí | Id del documento |
| `name` | string | sí | Nombre comercial |
| `nameLower` | string | sí | Nombre en minúsculas para búsqueda por prefijo |
| `imageUrl` | string \| null | no | URL https de la imagen |
| `brand` | string \| null | no | Primera marca de OpenFoodFacts |
| `category` | string \| null | no | Primera categoría |
| `quantityLabel` | string \| null | no | Formato («1 L», «450 g») |
| `source` | `openfoodfacts \| seed` | no | Origen del registro (auditoría) |
| `updatedAt` | timestamp | sí | Última escritura de la caché |

```json
{
  "barcode": "3560070976453",
  "name": "Leche entera Carrefour",
  "nameLower": "leche entera carrefour",
  "imageUrl": "https://images.openfoodfacts.org/images/products/...",
  "brand": "Carrefour",
  "category": "Lácteos",
  "quantityLabel": "1 L",
  "source": "openfoodfacts",
  "updatedAt": "2026-10-26T09:12:00.000Z"
}
```

Índice usado: `nameLower` ascendente para `where >= && where <= && orderBy` (índice de un
solo campo, automático).

### `stock/{barcode}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `barcode` | string | sí | Id del documento |
| `quantity` | integer ≥ 0 | sí | Unidades disponibles |
| `updatedAt` | timestamp | sí | Última modificación |

```json
{
  "barcode": "3560070976453",
  "quantity": 48,
  "updatedAt": "2026-10-26T09:15:00.000Z"
}
```

Invariantes: entero (Zod), no negativo (Zod + `Math.max` defensivo al leer). La escritura es
`set(..., { merge: true })`; el id garantiza idempotencia. `updatedAt` se genera en servidor.

### `statistics/{barcode}`

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `barcode` | string | sí | Id del documento |
| `views` | integer ≥ 0 | sí | Contador de consultas de detalle |

```json
{ "barcode": "3560070976453", "views": 231 }
```

Se incrementa con `FieldValue.increment(1)` (atómico, sin lecturas previas). Es best-effort:
si falla, la consulta del producto no falla. Top 5 por `views` descendente.

## 3. Consultas que ejecuta la API

| Operación | Consulta | Índice |
| --- | --- | --- |
| Perfil por uid | `users/{uid}` | — (id) |
| Perfil por email | `where email ==` + `limit 1` | automático |
| Listar usuarios | `orderBy name` + `limit 500` | automático |
| Contar admins | `where role ==` + `count()` | automático |
| Producto | `products/{barcode}` | — (id) |
| Búsqueda local | `nameLower >= t`, `<= t+\uf8ff`, `orderBy nameLower` | automático |
| Recientes | `orderBy updatedAt desc` + `limit` | automático |
| Varios productos | `db.getAll(...refs)` (≤ 50) | — |
| Stock | `stock/{barcode}` | — (id) |
| Stock bajo | `where quantity <= X`, `orderBy quantity asc` + `limit` | automático |
| Conteos | `count()` sobre `quantity <= X` y `quantity == 0` | automático |
| Totales | `aggregate(count(), sum(quantity))` | — |
| Top vistos | `statistics orderBy views desc` + `limit 5` | automático |
| Registrar vista | `set({ views: increment(1) }, merge)` | — |

No hay índices compuestos en el MVP; por eso `firestore.indexes.json` está vacío. Al añadir
filtros combinados (p. ej. `storeId == X` + `quantity <= Y`), declara el índice y despliega
con `firebase deploy --only firestore:indexes`.

## 4. Seguridad

`firebase/firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

- El Admin SDK **omite** las reglas; es el único acceso permitido.
- La app móvil no incluye `firebase/firestore`: no puede leer ni escribir aunque el APK se
  descompile y se extraiga la configuración web.
- No se usan custom claims para autorizar; el rol se lee de `users` en cada petición.

Despliegue:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Ciclo de vida y consistencia

- **Productos:** se crean/actualizan al consultar o buscar. No caducan automáticamente; el
  volumen está acotado por los productos que el equipo consulta. Un job futuro puede
  refrescar imagen/nombre o purgar los no usados en N meses.
- **Stock:** lo crea un admin al fijar cantidad (aunque el producto no esté catalogado) o el
  seed. No se borra al llegar a cero; cero significa «sin unidades».
- **Estadísticas:** se incrementan en cada detalle; no se decrementan.
- **Usuarios:** se crean con `POST /users` (Auth + Firestore, con compensación si falla la
  segunda escritura). No hay borrado en el MVP; se desactiva la cuenta en Firebase Auth si
  fuera necesario.

## 6. Coste aproximado (Firestore)

Cada consulta de detalle de producto cacheado: 1 lectura de producto + 1 de stock + 1
escritura de estadística. Primera consulta (no cacheada): +1 llamada a OpenFoodFacts y 1
escritura de producto. El dashboard: 2 agregaciones (1 lectura por cada 1.000 documentos
aproximada), 2 counts, y lecturas de hasta 10 productos/stock. Con el volumen de una tienda
(decenas de consultas/minuto) el coste es marginal; el límite práctico es OpenFoodFacts, no
Firestore.

## 7. Copias de seguridad y operación

- Activa **Point-in-Time Recovery** y exportaciones programadas a Cloud Storage.
- Restringe IAM: solo la cuenta de servicio del backend escribe en Firestore.
- Monitoriza `rules` y el uso de lecturas/escrituras en la consola.
- Para desarrollo, usa un proyecto Firebase distinto (nunca datos reales de tienda).

## 8. Extensiones previstas

| Extensión | Cambio |
| --- | --- |
| Multi-tienda | `stores/{storeId}`; `stock/{storeId}_{barcode}` o subcolección; claim `storeId` |
| Histórico | `stockHistory/{autoId}`: barcode, previous, next, actorUid, reason, createdAt |
| Auditoría de usuarios | `auditLogs/{autoId}` con actor, acción y diff |
| Catálogo completo | ETL nocturno a `products` + búsqueda con Typesense/Algolia |
| Favoritos | `users/{uid}/favorites/{barcode}` |
| Notificaciones | `deviceTokens/{uid}` + FCM al cruzar el umbral |
