# 08 · Roadmap de desarrollo (2 semanas, 4 personas)

## 1. Equipo y ownership

| Persona | Rol | Responsabilidad principal |
| --- | --- | --- |
| **M1** | Mobile lead | Navegación, auth, catálogo, detalle, design system |
| **M2** | Mobile | Dashboard, stock bajo, pantallas admin, componentes y accesibilidad |
| **B1** | Backend lead | API, auth/roles, Firestore, OpenFoodFacts, tests |
| **B2** | Backend/DevOps | Stock, usuarios, Docker/CI, Firebase, EAS, despliegue y QA de roles |

Regla: cada PR tiene un revisor que no es su autor; M1 revisa móvil de M2 y viceversa;
B1/B2 se revisan entre sí. Los cambios de contrato API se acuerdan en pareja B1↔M1 el mismo
día.

## 2. Preparación previa (Sprint 0, medio día)

Antes del día 1, para no bloquear al equipo:

- [ ] Proyecto Firebase de desarrollo + Auth email/contraseña + Firestore.
- [ ] Cuenta de servicio del backend y app web de Firebase para el móvil.
- [ ] Repositorio, protecciones de `main` y CI esqueleto.
- [ ] Contrato API v1 (endpoints, envelope, errores) revisado por los cuatro.
- [ ] Wireframes de las 12 pantallas y tokens de marca.
- [ ] Créditos/cuenta EAS y acceso a Play Console (puede llegar al día 7).
- [ ] Decidir umbral de stock bajo (10 por defecto) con negocio.

## 3. Plan de 10 días

| Día | Backend (B1/B2) | Móvil (M1/M2) | Hito verificable |
| --- | --- | --- | --- |
| 1 | Scaffold Express/TS, env validado, `/health`, logger, errores | Scaffold Expo/TS, tema, navegación raíz, login visual | Arrancan API y app; contrato congelado |
| 2 | Auth Firebase + roles + Firestore users; tests 401/403 | Login Firebase, store de sesión, tabs por rol | Login real contra Firebase dev |
| 3 | Productos: repos, OFF client, caché, búsqueda, detalle; tests | Lista + búsqueda + detalle; estados vacío/error | Consulta de producto end-to-end |
| 4 | Stock: GET/PUT, low-stock, dashboard; seed | Dashboard + stock bajo; badges y pull-to-refresh | Datos demo visibles en la app |
| 5 | Usuarios: listar, provisioning, cambio de rol; tests | Admin home, gestión de stock y usuarios | **Demo interna 1** + revisión de alcance |
| 6 | Endurecimiento: Zod, CORS, rate limit, redacción, JSON inválido | Pulido UI, accesibilidad, errores de red, perfil | Tests y lint verdes; sin bugs P0 |
| 7 | Docker multi-stage, compose, imagen probada; staging | Build EAS preview (APK), instalación en dispositivos | APK instalable contra staging |
| 8 | QA backend de roles, OpenFoodFacts caído, readiness, backups | QA de flujos por rol, textos, rendimiento, teclado | Matriz de roles pasada; bugs corregidos |
| 9 | Despliegue producción, secretos, reglas Firestore, monitorización | Build producción (AAB), Play Console internal testing | Producción + APK/AAB distribuidos |
| 10 | Smoke tests, runbook, handoff técnico | Demo final, guion de formación, retrospectiva | **Release MVP** + backlog post-MVP |

Ritmo diario: daily de 15 min (qué hice, qué haré, bloqueos), pairing en los puntos de
integración (días 3, 5 y 7), revisión de PRs en menos de 4 h laborables. Congelación de
alcance el día 5 salvo bugs P0/P1.

## 4. Hitos y criterios de aceptación

| Hito | Día | Criterio |
| --- | --- | --- |
| **M1 · Esqueleto** | 1 | API responde `/health`; app muestra Login; CI ejecuta lint y tipos |
| **M2 · Acceso** | 2 | Login con Firebase; rol cargado; tabs correctas; 401/403 probados |
| **M3 · Catálogo** | 4 | Buscar, ver ficha y stock; caché OFF; dashboard con datos seed |
| **M4 · Administración** | 5 | Admin edita stock y cambia roles; supervisor ve stock bajo |
| **M5 · Release** | 10 | Backend dockerizado desplegado, APK/AAB firmado, reglas Firestore activas, smoke tests OK |

## 5. Backlog MVP

### Must (comprometido)

| Historia | Estado en este repo |
| --- | --- |
| Login con Firebase y sesión persistente | ✅ |
| Roles employee/supervisor/admin aplicados en servidor | ✅ |
| Listado y búsqueda de productos (nombre, marca, barcode) | ✅ |
| Ficha con nombre, imagen, marca, categoría, barcode y stock | ✅ |
| Dashboard de stock (totales, top vistos, stock bajo) | ✅ |
| Stock bajo visible para supervisor | ✅ |
| Admin modifica stock con validación y auditoría en logs | ✅ |
| Admin gestiona usuarios (listar, provisionar, cambiar rol) | ✅ (API + listado/rol en app) |
| Backend dockerizado y desplegable | ✅ |
| Documentación y CI | ✅ |

### Should (si hay margen en el día 8–9)

- Escáner de códigos con `expo-camera`.
- Paginación por cursor en productos y usuarios.
- Pantalla de alta de usuario en la app (invitación).
- Historial de cambios de stock consultable.
- Tests de componentes con Testing Library.

### Could (post-MVP)

- Modo oscuro, i18n catalán/inglés, favoritos, notificaciones push, offline-first,
  multi-tienda, ETL de catálogo, analítica de búsquedas sin resultados.

## 6. Matriz de QA manual (día 8)

| Escenario | Employee | Supervisor | Admin |
| --- | --- | --- | --- |
| Login correcto / incorrecto | ✅ | ✅ | ✅ |
| Ver pestaña Stock bajo | ❌ oculta | ✅ | ✅ |
| Abrir stock bajo y detalle | — | ✅ | ✅ |
| Ver pestaña Admin | ❌ | ❌ | ✅ |
| Editar stock (UI y API) | ❌ 403 | ❌ 403 | ✅ |
| Cambiar rol | ❌ 403 | ❌ 403 | ✅ |
| Auto-degradarse | — | — | ❌ 409 |
| Usuario sin perfil | 403 + logout | ídem | ídem |
| API caída / sin red | Error + reintentar | ídem | ídem |
| OpenFoodFacts caído | Caché local | ídem | ídem |
| Token caducado | Refresh transparente | ídem | ídem |

## 7. Riesgos del sprint

| Riesgo | Prob. | Impacto | Mitigación | Owner |
| --- | --- | --- | --- | --- |
| Credenciales Firebase tardías | Media | Alto | Sprint 0; proyecto dev propio; dobles en tests | B2 |
| OpenFoodFacts inestable | Media | Medio | Caché + fallback local + timeout | B1 |
| Curva de React Navigation 7 | Baja | Medio | M1 lidera navegación; pair con M2 | M1 |
| Build EAS bloqueado por cuenta | Media | Alto | Iniciar el día 1; perfil preview APK | B2 |
| Alcance creciente | Alta | Alto | Congelación día 5; Should/Could al backlog | Todos |
| Falta de dispositivos de prueba | Baja | Medio | Expo Go + emulador; 2 móviles de tienda | M2 |
| Deuda por prisas | Media | Medio | Tests desde el día 2; DoD y revisión | B1 |

## 8. Después del MVP

**30 días**

- Escáner de barcode y alta de usuarios desde la app.
- Historial de stock (`stockHistory`) y auditoría visible.
- Métricas de uso y alertas (5xx, latencia, errores de auth).
- Tests de componentes y un E2E Maestro del flujo crítico.

**60 días**

- Multi-tienda (stock por tienda) y claims de tienda.
- ETL de catálogo Carrefour + búsqueda local (Typesense/Algolia).
- Notificaciones push de stock bajo a supervisores.
- Offline-first para consultas y edición con cola de sincronización.

**90 días**

- Analítica de reposición y previsión de demanda.
- Integración con sistema de inventario corporativo.
- Panel web de administración (mismo backend).
- Certificación de seguridad y revisión de accesibilidad completa.
