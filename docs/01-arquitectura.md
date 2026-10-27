# 01 · Arquitectura

## 1. Objetivo y restricciones

Carrefour Stock Mobile permite al personal de tienda consultar productos y stock, detectar
reposiciones y —solo a administradores— modificar inventario y roles. El MVP debe estar
operativo en **2 semanas** con **4 personas**, y dejar preparada la evolución a escáner de
códigos, multi-tienda, offline y analítica.

Restricciones que explican las decisiones:

- El equipo conoce React Native/Expo y Node/Express.
- Firebase es la plataforma corporativa elegida (Auth + Firestore).
- La app es Android-first, pero se mantiene compatible con iOS vía Expo.
- El backend debe desplegarse en contenedor.
- No se puede asumir que OpenFoodFacts esté siempre disponible ni que sea rápido.

## 2. Vista de contexto

```
                ┌───────────────────────────────┐
                │        Empleado/a             │
                │  (Android, uso interno)       │
                └───────────────┬───────────────┘
                                │ HTTPS
                ┌───────────────▼───────────────┐
                │   Carrefour Stock Mobile      │
                │   App Expo + API Express      │
                └───────┬───────────────┬───────┘
                        │               │
          Firebase Admin SDK            │ HTTPS (catálogo)
                        │               │
          ┌─────────────▼──────┐   ┌────▼─────────────────┐
          │ Firebase           │   │ OpenFoodFacts        │
          │ Auth + Firestore   │   │ (productos, imágenes)│
          └────────────────────┘   └──────────────────────┘
```

**No hay acceso directo de la app a Firestore.** Todo pasa por la API: los roles, la
validación y la lógica de stock se aplican en un único punto. Las reglas de Firestore
deniegan cualquier lectura/escritura de cliente; el Admin SDK las omite por diseño.

## 3. Arquitectura del backend

Organización en capas con dependencias hacia dentro (estilo puertos y adaptadores):

```
HTTP (routes) → Controllers → Services → Ports (interfaces) ← Adaptadores
                                                   ├── Firestore repositories
                                                   ├── Firebase Auth (verifier / identity admin)
                                                   └── OpenFoodFacts client
```

| Capa | Responsabilidad | Ejemplos |
| --- | --- | --- |
| `routes/` | Composición de endpoints y middleware de rol | `products.routes.ts` |
| `middleware/` | Auth, autorización, request-id, errores | `authenticate.ts` |
| `modules/*/controller` | Parseo Zod + traducción HTTP | `stock.controller.ts` |
| `modules/*/service` | Reglas de negocio, orquestación | `ProductService`, `UserService` |
| `core/ports.ts` | Contratos de persistencia e integraciones | `StockRepository` |
| `infrastructure/` | Implementaciones Firebase/Firestore | `FirestoreStockRepository` |
| `integrations/` | Cliente OpenFoodFacts + mapper | `openfoodfacts.client.ts` |

Ventajas:

- Los tests de API usan dobles en memoria (`backend/tests/helpers`), sin emulador ni red.
- Sustituir Firestore por otra base implica un adaptador nuevo, no tocar servicios.
- Las reglas de negocio se leen sin ruido HTTP.

El detalle de los endpoints está en [10-api.md](10-api.md) y el modelo en
[03-modelo-firestore.md](03-modelo-firestore.md).

## 4. Arquitectura de la app

```
App.tsx
 ├─ SafeAreaProvider + StatusBar
 └─ RootNavigator                      ← estado de sesión (Zustand)
     ├─ SplashScreen                   boot / carga de perfil
     ├─ AuthNavigator → LoginScreen
     └─ AppTabs                        tabs según rol
         ├─ ProductsStack  (lista → detalle)
         ├─ DashboardStack
         ├─ LowStockStack  (supervisor+)
         ├─ AdminStack     (admin)
         └─ ProfileStack
```

| Carpeta | Responsabilidad |
| --- | --- |
| `src/api` | Cliente Axios, endpoints tipados, normalización de errores |
| `src/services` | Firebase Auth y persistencia de sesión |
| `src/store` | Zustand: `auth`, `products`, `dashboard` |
| `src/navigation` | Navigators, param lists y guards por rol |
| `src/screens` | Pantallas; sin lógica de red compleja |
| `src/components` | UI reutilizable (botones, tarjetas, estados) |
| `src/theme` | Tokens de color, espaciado, radios y tipografía |
| `src/utils` | Roles, formato de fechas/cantidades |

Principios aplicados:

- **Estado de servidor en stores, estado de UI en la pantalla.** El formulario de stock vive
  en el componente; los datos compartidos (catálogo, dashboard, perfil) en Zustand.
- **Un único cliente HTTP con interceptores** inyecta el ID token y refresca una vez ante
  un 401.
- **La UI respeta permisos, el backend los impone.** Las pestañas de supervisor/admin solo
  se montan si el rol las permite.

## 5. Decisiones de arquitectura (ADR resumidas)

| # | Decisión | Motivo | Consecuencia |
| --- | --- | --- | --- |
| 1 | API como única puerta de datos | Roles y validación centralizados; reglas Firestore cerradas | Un salto de red más; API stateless escalable |
| 2 | Rol en `users/{uid}`, no en custom claims | Un admin puede cambiar roles sin reautenticar; fuente única | Una lectura de Firestore por petición (mitigable con caché) |
| 3 | Puertos + adaptadores | Tests rápidos y sustitución de proveedores | Algo más de código por entidad |
| 4 | `products` como caché de OpenFoodFacts | Evita depender del API externo en cada consulta | Catálogo incompleto hasta que se consulta |
| 5 | `stock/{barcode}` con id = código | Lectura directa, idempotencia, sin índices | Un documento por producto |
| 6 | Estadísticas de vistas best-effort | Una visita no debe fallar por analítica | Si Firestore falla, se pierde la vista |
| 7 | React Navigation (no Expo Router) | Requisito del proyecto; navegación programática por rol | Configuración manual de stacks |
| 8 | Firebase JS SDK + AsyncStorage | Funciona en Expo Go, sin prebuild nativo | El token se guarda en almacenamiento de la app, no en Keychain/Keystore |
| 9 | Envelope de error único | Un solo parser en la app; `requestId` para soporte | Contrato que hay que versionar |
| 10 | Node 24 + Express 5 | LTS actual; soporte nativo de async/await | Requiere `>=22` en `engines` |

### 5.1 Autenticación (secuencia)

```
Usuario            App                    Firebase Auth            API
  │  email+pass      │                          │                    │
  ├─────────────────▶│ signInWithEmailAndPassword│                    │
  │                  ├─────────────────────────▶│                    │
  │                  │◀──── ID token + refresh ─┤                    │
  │                  │ onAuthStateChanged        │                    │
  │                  ├────── GET /users/me (Bearer) ─────────────────▶│
  │                  │                          │ verifyIdToken      │
  │                  │                          │◀───────────────────┤
  │                  │                          │ users/{uid}        │
  │                  │◀──── perfil + rol ──────────────────────────────┤
  │                  │ tabs según rol            │                    │
```

- El backend verifica el ID token con `firebase-admin` en cada petición.
- Si el usuario existe en Auth pero no en `users`, responde
  `403 USER_NOT_PROVISIONED`; la app cierra sesión y muestra el motivo.
- Axios adjunta el token en cada llamada; ante `401` fuerza un refresh y reintenta **una**
  vez. Si falla, cierra sesión.

### 5.2 Consulta de producto (cache-aside + degradación)

1. `GET /products/:barcode` busca en `products/{barcode}`.
2. Si no existe, consulta OpenFoodFacts (timeout 6 s, un reintento, caché en memoria 10 min).
3. Guarda/actualiza el producto en Firestore y devuelve producto + stock (`stock/{barcode}`).
4. Registra la vista en `statistics/{barcode}` de forma best-effort.

En búsqueda de texto (`?q=`): se combinan coincidencias locales por prefijo y resultados de
OpenFoodFacts; si el API externo falla y hay coincidencias locales, se devuelven esas.

### 5.3 Actualización de stock

`PUT /stock/:barcode` (solo admin) valida entero ≥ 0, escribe cantidad + `updatedAt` con
`serverTimestamp`, relee el documento para devolver el valor autoritativo y registra en el
log estructurado: actor, email, cantidad anterior y nueva. El stock no depende de que el
producto exista en el catálogo.

## 6. Seguridad

| Amenaza | Mitigación |
| --- | --- |
| Escalada de privilegios | `ROLE_RANK` en backend; nunca se confía en el rol del cliente |
| Robo de token | HTTPS obligatorio, tokens de vida corta, refresh gestionado por Firebase |
| Acceso directo a Firestore | Reglas `allow read, write: if false`; solo Admin SDK |
| Fuerza bruta / abuso | Rate limit por IP (300 req/min por defecto) + límites de Firebase Auth |
| Inyección / datos corruptos | Zod en todos los bordes; límites de longitud y rango |
| Fuga en logs | Pino con redacción de `authorization`, cookies y tokens |
| Enumeración de usuarios | `POST /users` solo admin; errores de email genéricos |
| Borrado accidental del último admin | Guardas `CANNOT_DEMOTE_SELF` y `LAST_ADMIN` |
| Contenedor comprometido | Non-root, `cap_drop: ALL`, filesystem read-only, imagen slim |

Pendiente para producción: WAF/Cloud Armor, alertas sobre 401/403/429, rotación de cuentas
de servicio y revisión de dependencias (`npm audit` en CI).

## 7. Escalabilidad y rendimiento

- La API es **stateless**: escala horizontalmente sin sesiones en servidor.
- Firestore escala por documento; las consultas usan IDs y rangos acotados (`limit`).
- La caché de OpenFoodFacts es por instancia; con N réplicas se multiplican las llamadas.
  Evolución: Redis compartido o caché en Firestore con TTL.
- El rate limit en memoria también es por instancia → Redis si hay varias réplicas.
- Los listados tienen topes (productos 50, usuarios 500, low-stock 100). La paginación por
  cursor está prevista.
- Imágenes: se sirven desde OpenFoodFacts y se cachean en disco con `expo-image`; no
  consumen ancho de banda del backend.

## 8. Observabilidad

- Logs JSON con `requestId`, método, ruta, estado y latencia (`pino-http`).
- `GET /health` (liveness) y `GET /ready` (comprueba Firestore).
- Errores 5xx con `requestId` devuelto al cliente para correlación.
- Eventos de negocio: `Stock updated`, `User role updated`, `User provisioned`.
- Próximo paso: exportar logs a Cloud Logging y métricas de latencia/errores por endpoint.

## 9. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| OpenFoodFacts limita peticiones o cae | Búsqueda degradada | Caché, reintento, fallback local, User-Agent identificable |
| Datos de producto incompletos | Ficha pobre | Placeholder y campos opcionales; ETL futuro |
| Credenciales Firebase mal configuradas | API no arranca | Validación de env al inicio, `/ready`, mensajes claros |
| Retraso en altas de usuarios | Bloqueo del equipo | `bootstrap-admin` + `POST /users` con enlace de acceso |
| 2 semanas es ajustado | Deuda | Alcance congelado (ver roadmap), tests desde el día 1, CI |
| Dispositivos de tienda antiguos | Rendimiento | Expo/Hermes, FlatList, imágenes optimizadas, sin librerías pesadas |

## 10. Evolución prevista

1. **Escáner de códigos** (`expo-camera`) para consulta y edición de stock.
2. **Histórico de stock** (`stockHistory`) y auditoría consultable por admin.
3. **Multi-tienda**: `stores/{storeId}` y stock por tienda; claims con tienda asignada.
4. **Offline-first** con caché persistente y cola de sincronización para cambios de stock.
5. **ETL de catálogo** desde OpenFoodFacts + categorías propias Carrefour.
6. **Notificaciones** de stock bajo (FCM) a supervisores.
7. **Observabilidad** gestionada (Cloud Logging/Monitoring) y trazas distribuidas.
