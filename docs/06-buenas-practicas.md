# 06 · Buenas prácticas

## 1. Código

- **TypeScript estricto** en ambos proyectos (`strict`, `noUncheckedIndexedAccess` en backend).
  Sin `any` implícitos; los `unknown` se validan con Zod o type guards.
- **ESLint + Prettier** como única fuente de estilo. Backend: flat config con
  `typescript-eslint`. Móvil: `eslint-config-expo`. Nada de desactivaciones globales.
- **Funciones pequeñas y con una responsabilidad.** Servicios sin Express; controladores sin
  Firestore.
- **Errores como valores de dominio** (`AppError`), no strings sueltos.
- **Comentarios solo para el “por qué”** (p. ej. por qué se usa `as unknown` para
  `getReactNativePersistence`, por qué una vista es best-effort).
- **Sin secretos en el código** ni en logs. `.env` está ignorado; `.env.example` documenta.
- **Sin `console.log`** en backend (Pino) ni en pantallas (estados de UI).
- **Fechas siempre ISO en tránsito**, formateadas en el borde de presentación (`utils/format`).

## 2. Git y revisión

- Trunk-based: `main` siempre desplegable; ramas cortas `feat/...`, `fix/...`, `chore/...`.
- Commits convencionales: `feat(stock): permitir editar cantidad`, `fix(auth): ...`.
- PR pequeño (< 400 líneas), con contexto, capturas si cambia UI y pasos de prueba.
- **Una aprobación** obligatoria; el autor no mergea su propio PR.
- CI obligatoria en verde: lint, tipos, tests, build y bundle Android.
- No se mergea código comentado, `TODO` sin issue ni dependencias sin justificar.
- Los cambios de contrato API actualizan `docs/10-api.md` y los tipos móviles en el mismo PR.

## 3. Testing

Pirámide aplicada:

| Nivel | Qué cubre | Herramienta | Estado |
| --- | --- | --- | --- |
| Unitario/servicio | Reglas y casos borde | Vitest | Servicios cubiertos vía API |
| Integración API | Auth, roles, contratos, errores | Vitest + Supertest + dobles | 54 tests |
| Componentes | Render y estados | Jest + Testing Library | Pendiente (post-MVP) |
| E2E | Login → consulta → editar stock | Maestro/Detox | Pendiente (dispositivo) |

Reglas:

- Cada bug se arregla con un test que falla antes y pasa después.
- Prohibido testear detalles de implementación (nombres de funciones internas); se testea
  comportamiento HTTP/UI.
- Los dobles en memoria deben respetar el contrato de los puertos (incluido lanzar
  `AppError` 503 cuando simulan una caída).
- Sin `sleep` arbitrarios en tests; sin dependencia de red real.
- Cobertura no es un objetivo en sí; se priorizan caminos de autorización, validación y
  errores.

Comandos:

```bash
cd backend && npm test
cd mobile && npm run typecheck && npm run lint
```

## 4. Seguridad

- **Mínimo privilegio:** el rol se lee en el servidor en cada petición; las pestañas ocultas
  no son control de acceso.
- **Validación en el borde:** todo body/query/param pasa por Zod; límites de longitud y rango.
- **Firestore cerrado:** reglas deny-all; solo Admin SDK. La configuración web de Firebase es
  pública por diseño, pero sin reglas abiertas no expone datos.
- **Tokens:** solo en cabecera `Authorization`; nunca en query strings ni logs (Pino redacta).
- **Rate limiting** por IP; en producción añadir WAF y límites por usuario si hay abuso.
- **Dependencias:** revisar `npm audit` en cada PR; actualizar con lockfile.
- **Secretos:** `FIREBASE_SERVICE_ACCOUNT_JSON` por variable de entorno/Secret Manager, nunca
  en la imagen ni en el repo. Rotar si se filtran.
- **Errores:** no devolver stacks ni detalles internos; sí `requestId` para correlación.
- **Provisioning:** solo admin; guardas contra auto-degradación y contra eliminar el último
  admin.
- **Contenedor:** usuario no root, `cap_drop: ALL`, `no-new-privileges`, filesystem read-only.

Checklist antes de publicar:

- [ ] Reglas Firestore desplegadas y probadas (lectura directa debe fallar).
- [ ] `GET /api/v1/users` sin token devuelve 401; con employee, 403.
- [ ] `PUT /stock` con supervisor devuelve 403.
- [ ] CORS limitado a dominios conocidos.
- [ ] Secretos fuera del repositorio y de la imagen.
- [ ] Backups/PITR activos.

## 5. Convenciones de API

- Prefijo versionado `/api/v1`.
- JSON en `camelCase`; fechas ISO 8601 UTC.
- Respuesta correcta: `{ "data": ... }` (+ `meta` en listas).
- Error: `{ "error": { code, message, details?, requestId } }`.
- Códigos HTTP: 200 lectura/actualización, 201 creación, 400 validación, 401 sin token,
  403 rol/perfil, 404 recurso, 409 conflicto de negocio, 429 rate limit, 503 dependencia
  externa, 500 inesperado.
- `code` es estable y máquina-legible; `message` es para personas y puede cambiar.
- Listas siempre acotadas (`limit` validado). Nunca `get()` sin límite.
- Escrituras idempotentes: `PUT /stock/:barcode` fija un valor absoluto.
- Operaciones sensibles registran actor y valores anterior/nuevo en logs.

## 6. Firestore

- Ids de documento = claves naturales (`uid`, `barcode`).
- `serverTimestamp()` para `createdAt`/`updatedAt`; nunca la hora del cliente.
- `set(..., { merge: true })` para actualizaciones parciales; `update` solo si el doc debe
  existir.
- Incrementos atómicos (`FieldValue.increment`) para contadores.
- Evitar lecturas N+1: `getAll` para lotes pequeños; agregaciones (`count`, `sum`) para totales.
- Índices explícitos solo cuando la consulta los requiera; desplegarlos por CI.
- Datos derivados (rol en token, contadores) se evitan como fuente de verdad.

## 7. Rendimiento móvil

- `FlatList` con `keyExtractor` estable y `memo` en tarjetas; nunca `ScrollView` con listas
  largas.
- Imágenes con `expo-image` (caché en disco, `contentFit`, transición corta).
- Evitar re-render global: selectores de Zustand por campo, no el store completo.
- Debounce de búsqueda (400 ms) y cancelación lógica por `requestId` en stores.
- Sin librerías nativas innecesarias: todo funciona en Expo Go (salvo builds EAS).
- Presupuesto: arranque en frío < 2 s en dispositivo de gama media; bundle Hermes ~3 MB
  (verificado en `expo export`).

## 8. Accesibilidad e internacionalización

- Etiquetas `accessibilityLabel` en controles, `accessibilityState` en selección/loading.
- No transmitir información solo por color: el badge de stock incluye texto.
- Textos en español centralizados por pantalla; el paso a `i18n-js`/`expo-localization`
  consiste en extraer literales a un diccionario (no hay literales en componentes de lógica).
- Formato de números/fechas con `Intl` y locale `es-ES`.

## 9. Observabilidad

- Todo request lleva `X-Request-Id` (se acepta uno válido del cliente o se genera).
- Logs estructurados con `requestId`, ruta, estado, latencia y actor en operaciones de stock.
- `/health` para liveness, `/ready` para dependencias.
- Alertas recomendadas: tasa de 5xx > 1 %, p95 > 1 s, 429 crecientes, fallos de OpenFoodFacts.
- No loggear cuerpos completos con datos personales.

## 10. Definition of Done

Una tarea está terminada cuando:

1. Cumple el criterio funcional y los roles.
2. Tiene tests (backend) o verificación documentada (UI) y CI en verde.
3. `lint`, `typecheck` y build pasan.
4. Los errores y estados vacíos están diseñados.
5. La documentación afectada está actualizada (API, modelo, pantallas).
6. No introduce secretos, `any` ni dependencias sin justificar.
7. Ha pasado revisión de otra persona.
