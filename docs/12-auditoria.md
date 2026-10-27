# 12 · Auditoría del MVP

**Fecha:** 2026-10-27  
**Alcance:** revisión de la documentación fuente, código y gates locales definidos para el
MVP. No se modificó funcionalidad ni se conectó con Firebase real.

## Resultado

El núcleo P0 está implementado y los gates estáticos/automatizados solicitados pasan. La
auditoría no demuestra todavía el recorrido completo en un dispositivo conectado a un
proyecto Firebase real ni el arranque de los contenedores. Además, la aplicación móvil no
incluye una pantalla para crear usuarios: la API sí ofrece esa operación y la documentación
la sitúa en backoffice.

| Requisito | Estado (hecho/parcial/falta) | Evidencia (fichero o comando) | Qué falta | Prioridad |
|---|---|---|---|---|
| Login email/contraseña, persistencia de sesión y carga de perfil | parcial | `mobile/src/services/auth.ts`, `mobile/src/store/auth.store.ts`, `mobile/src/config/env.ts`; `npm run lint`, `npm run typecheck` y export Android pasan | Validar inicio, persistencia y recuperación con Firebase real en emulador o móvil; el export solo verifica el bundle | P0 |
| Manejo de perfil no provisionado y error de perfil | hecho | `backend/src/middleware/authenticate.ts`, `mobile/src/store/auth.store.ts`, `mobile/src/screens/ProfileErrorScreen.tsx`; backend tests pasan | Ninguno en código; la configuración real no se probó en esta auditoría | P0 |
| Roles y permisos impuestos por el servidor | hecho | `backend/src/middleware/authorize.ts`, `backend/src/routes/stock.routes.ts`, `backend/src/routes/user.routes.ts`, `mobile/src/navigation/AppTabs.tsx`; `npm test` (54 tests) | Ninguno identificado en la revisión; el flujo real del servidor no se ejecutó | P0 |
| Catálogo, búsqueda, detalle y visualización de stock | parcial | `backend/src/modules/products/`, `mobile/src/screens/ProductListScreen.tsx`, `mobile/src/screens/ProductDetailScreen.tsx`; lint, typecheck, tests backend y export Android pasan | Verificar catálogo sembrado y consultas contra Firebase/OpenFoodFacts reales; no se ejecutó `npm run seed` | P0 |
| Administración de stock y validación de cantidad | parcial | `backend/src/routes/stock.routes.ts`, `backend/src/modules/stock/`, `mobile/src/screens/StockManagementScreen.tsx`; tests backend pasan | Confirmar actualización de extremo a extremo y refresco en dispositivo conectado a datos reales | P0 |
| Dashboard y productos con stock bajo según rol | parcial | `backend/src/modules/dashboard/`, `backend/src/routes/stock.routes.ts`, `mobile/src/screens/DashboardScreen.tsx`, `mobile/src/screens/LowStockScreen.tsx`; tests backend pasan | Probar con datos reales y verificar presentación por rol en dispositivo | P1 |
| Gestión de usuarios: listar, cambiar rol, proteger último admin y auto-degradación | hecho | `backend/src/modules/users/user.service.ts`, `backend/src/routes/user.routes.ts`, `mobile/src/screens/UserManagementScreen.tsx`; tests backend pasan | Verificación de integración con Firebase real | P1 |
| Gestión de usuarios: crear cuentas desde la app | parcial | `backend/src/routes/user.routes.ts` y `backend/src/modules/users/user.service.ts` implementan `POST /users`; `mobile/src/screens/UserManagementScreen.tsx` ofrece listado y cambio de rol, pero no creación; README documenta alta por backoffice | Añadir UI de alta y entrega segura del enlace, si se requiere que el criterio de aceptación 7 ocurra dentro de la app | P1 |
| Pantallas definidas y estados de carga, error, vacío y contenido | parcial | Existen 12 pantallas en `mobile/src/screens/`; `ProductListScreen.tsx`, `DashboardScreen.tsx`, `LowStockScreen.tsx` y `UserManagementScreen.tsx` implementan estados de datos | No hay suite automatizada móvil ni verificación visual/dispositivo para demostrar todos los estados en cada flujo | P1 |
| Reglas Firestore: el cliente no accede directamente | hecho | `firebase/firestore.rules`, `mobile/src/` usa API y Firebase Auth; `docs/03-modelo-firestore.md` | Ninguno identificado en el alcance revisado | P0 |
| Seed y provisión de administrador | hecho | `backend/src/scripts/seed.ts`, `backend/src/scripts/bootstrap-admin.ts`, scripts en `backend/package.json`; documentado en README y `docs/09-despliegue.md` | No se ejecutaron: modificarían datos del proyecto Firebase y no son necesarios para los gates locales | P0 |
| Contrato de API, envelope y rutas protegidas | hecho | `backend/src/routes/`, `backend/src/middleware/`, `docs/10-api.md`; `npm test` pasa | Ninguno identificado en la revisión de código y pruebas automatizadas | P0 |
| CI y perfiles EAS preview/production | parcial | `.github/workflows/ci.yml`, `mobile/eas.json`; CI define lint, typecheck, tests, export Android y build de imagen backend | El workflow no valida `docker compose --profile build config -q` ni construye las imágenes del stack completo | P2 |
| Docker Compose configurado para API, Metro y bundle | parcial | `docker-compose.yml`, `backend/Dockerfile`, `mobile/Dockerfile`; `docker compose --profile build config -q` pasa | No se ejecutaron `docker compose build` ni `docker compose up`; salud y conexión real requieren validar el entorno | P2 |
| Versión de Node requerida | parcial | README y CI fijan Node 24; `node --version` devuelve `v24.22.0`; `backend/package.json` declara `>=22` | Alinear `engines.node` con Node 24 para que la restricción del backend sea consistente | P2 |
| Alertas conocidas de dependencias móviles | parcial | `npm ci` en `mobile/` informó 8 vulnerabilidades altas; README ya documenta avisos en dependencias de herramientas de Expo | Revisar el detalle con `npm audit` y reevaluar al actualizar Expo; no ejecutar `npm audit fix` sin evaluar cambios mayores | P2 |

## Comandos ejecutados y resultados

| Comando | Resultado |
|---|---|
| `node --version` | `v24.22.0` |
| `npm --version` | `11.19.1` |
| `docker compose version` | `Docker Compose version v2.39.2` |
| Intento inicial de `npm ci` desde la raíz | Falló porque el monorepo no tiene `package.json` en la raíz; no instaló dependencias |
| `cd backend && npm ci && npm run lint && npm run typecheck && npm test && npm run build` | Correcto; lint, tipos y build pasan; Vitest: 8 archivos y 54 tests pasan; npm informó 0 vulnerabilidades en este workspace |
| `cd mobile && npm ci && npm run lint && npm run typecheck && npx expo export --platform android --output-dir .expo-export-check` | Correcto; lint, tipos y export Android pasan; `npm ci` informó 8 vulnerabilidades altas y avisos de scripts de instalación |
| `docker compose --profile build config -q` | Correcto, sin errores |

El directorio generado `mobile/.expo-export-check` se eliminó después de verificar el export.
La salida compilada de `backend/dist` también se limpió. No se ejecutaron Firebase seed,
bootstrap, emulador Android ni servicios Docker para evitar cambios en servicios/datos y
porque no son necesarios para validar los gates locales.

## Diferenciar configuración, código y documentación

- **Configuración/datos:** la disponibilidad de Firebase, credenciales, usuarios provisionados,
  productos sembrados y conectividad de la API no se verificó contra un proyecto remoto. Un
  fallo en esa prueba no demostraría por sí solo un bug de código.
- **Código:** lint, typecheck, tests backend, build backend y export Android pasan. La falta de
  creación de usuarios en la UI es un hueco de producto frente al criterio de aceptación 7,
  aunque la API sí permite hacerlo.
- **Documentación:** README y guías describen el alta de usuarios por backoffice. Esta auditoría
  queda añadida al índice; el estado actual de Docker se actualiza en README.

## Siguiente trabajo recomendado

1. **P0:** probar el flujo login → catálogo → detalle → cambio de stock con Firebase configurado
   y datos sembrados en un emulador o móvil.
2. **P1:** decidir si crear usuarios debe ser posible desde la app; si sí, implementar la UI y
   cubrirla con pruebas.
3. **P1:** validar visualmente estados de carga, error, vacío y contenido en los flujos móviles.
4. **P2:** alinear `backend/package.json` con Node 24, revisar las vulnerabilidades móviles y
   ampliar CI/validación Docker al stack Compose.
