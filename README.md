# Carrefour Stock Mobile

Aplicación Android para el personal de tienda de Carrefour: consulta de productos y stock,
alertas de reposición y administración de inventario y roles. Monorepo con app móvil
(React Native + Expo), API REST (Node.js + Express) y Firebase (Authentication + Firestore).

> **Estado:** MVP completo (código base listo para desplegar). El backend está cubierto por
> 54 tests automatizados; la app compila, pasa lint y genera el bundle de Android. Para
> ejecutarla contra datos reales solo faltan las credenciales del proyecto Firebase.

## Stack

| Capa | Tecnología |
| --- | --- |
| Móvil | React Native 0.88 · Expo SDK 58 · TypeScript |
| Navegación | React Navigation 7 (native-stack + bottom-tabs) |
| Estado | Zustand 5 |
| HTTP | Axios 1.20 |
| Autenticación | Firebase Authentication (email/contraseña) |
| Backend | Node.js 24 · Express 5 · TypeScript |
| Base de datos | Firebase Firestore (Admin SDK) |
| Catálogo externo | OpenFoodFacts |
| Contenedores | Docker multi-stage + Docker Compose |
| Distribución | EAS Build (APK / AAB) |

## Arquitectura en 30 segundos

```
┌──────────────────────────┐        HTTPS + Bearer ID token        ┌──────────────────────────┐
│  Android (Expo)          │ ────────────────────────────────────▶ │  API Express             │
│  Screens · Zustand       │                                       │  Auth · Roles · Stock    │
│  Axios · Firebase Auth   │ ◀──────────────────────────────────── │  Validación · Errores    │
└────────────┬─────────────┘                                       └───────┬──────────┬───────┘
             │                                                             │          │
             │ login / refresh token                                       │ Admin    │ HTTPS
             ▼                                                             ▼          ▼
      ┌──────────────┐                                             ┌────────────┐ ┌──────────────┐
      │ Firebase Auth│                                             │ Firestore  │ │ OpenFoodFacts│
      └──────────────┘                                             └────────────┘ └──────────────┘
```

Decisiones clave:

- **Todo el acceso a datos pasa por la API.** La app nunca lee Firestore directamente;
  las reglas de Firestore niegan cualquier acceso de cliente.
- **El rol vive en `users/{uid}`** y se resuelve en cada petición, de modo que un cambio de
  rol es efectivo de inmediato sin esperar a refrescar el token.
- **OpenFoodFacts se usa como catálogo** y se cachea en `products`; el stock es siempre
  dato propio en `stock`. Si OpenFoodFacts falla, la API degrada a la caché local.
- **La capa de servicios depende de puertos** (`UserRepository`, `ProductRepository`, …),
  lo que permite testear toda la API con repositorios en memoria, sin emulador.

## Estructura del repositorio

```
.
├── backend/                 API Express + tests + Dockerfile
├── mobile/                  App Expo (React Navigation + Zustand)
├── firebase/                Reglas e índices de Firestore
├── docs/                    Arquitectura, modelo, pantallas, roadmap, despliegue…
├── .github/workflows/ci.yml CI: lint, tipos, tests, bundle y build de imagen
└── docker-compose.yml       Proyecto completo dockerizado: API + app (Metro) + bundle
```

Detalle completo en [docs/02-estructura-carpetas.md](docs/02-estructura-carpetas.md).

## Requisitos

- Node.js 24 (`.nvmrc`) y npm 11
- Docker Desktop / Docker Engine + **Docker Compose ≥ 2.24** (opcional para desarrollo local)
- Proyecto Firebase con **Authentication (email/contraseña)** y **Firestore**
- Para Android: Expo Go en el móvil o un emulador; EAS CLI para compilar el APK

## Puesta en marcha del backend

```bash
cd backend
cp .env.example .env          # rellena FIREBASE_SERVICE_ACCOUNT_JSON o usa ADC
npm ci
npm run dev                   # http://localhost:8080
```

Comprobaciones:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

Preparar datos y el primer administrador (requiere credenciales Firebase):

```bash
npm run seed                  # productos/stock de demo (solo desarrollo)
npm run bootstrap-admin -- --email admin@carrefour.com --name "Admin Carrefour"
```

El script imprime un enlace de restablecimiento de contraseña de un solo uso. A partir de ahí,
el administrador puede provisionar al resto del equipo con
`POST /api/v1/users` (la app muestra el listado y permite cambiar roles).

### Todo el proyecto con Docker

`docker-compose.yml` levanta el proyecto completo: la API (`api`, puerto 8080) y el servidor
Metro de la app (`mobile`, puerto 8081). El perfil `build` genera además el bundle de Android.

```bash
cp backend/.env.example backend/.env    # credenciales del Admin SDK
cp mobile/.env.example mobile/.env      # EXPO_PUBLIC_API_URL=http://<IP>:8080
printf 'REACT_NATIVE_PACKAGER_HOSTNAME=<IP de esta máquina>\n' > .env

docker compose up --build -d
docker compose ps             # api debe quedar "healthy", mobile "running"
docker compose logs -f mobile # muestra la URL exp://<IP>:8081 para Expo Go
docker compose --profile build run --rm mobile-bundle   # genera ./mobile/dist
docker compose down
```

La API corre como usuario sin privilegios, con sistema de archivos de solo lectura y
`cap_drop: ALL`. El código de la app se monta sobre `/app` (hot reload) y `node_modules`
vive en un volumen. Guía completa en [docs/07-docker.md](docs/07-docker.md).

## Puesta en marcha de la app

1. Crea una **app web** en Firebase (Configuración del proyecto → Tus apps) y copia su
   configuración.
2. Configura el entorno:

   ```bash
   cd mobile
   cp .env.example .env
   # EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, APP_ID
   # EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 (emulador Android)
   npm ci
   npx expo start
   ```

3. Abre el proyecto en Expo Go o pulsa `a` para el emulador Android.

También puedes arrancar solo Metro con Docker (`docker compose up -d mobile`) y abrir en
Expo Go la URL `exp://<IP>:8081` que aparece en `docker compose logs mobile`; en el
emulador de la misma máquina usa `exp://10.0.2.2:8081`. Ver [docs/07-docker.md](docs/07-docker.md).

En un dispositivo físico, `EXPO_PUBLIC_API_URL` debe apuntar a la IP LAN del equipo que
ejecuta la API (`http://192.168.x.x:8080`) o usar `npx expo start --tunnel` para el bundler.
La app muestra una pantalla de configuración si faltan variables, en lugar de fallar en
blanco.

Para probar desde un teléfono con el proyecto ejecutándose en una VM remota, consulta la
guía de [Expo Go con túneles temporales](docs/12-prueba-expo-go-vm.md).

## API

Base: `http://<host>:8080/api/v1`. Todas las rutas (salvo `/health` y `/ready`) requieren
`Authorization: Bearer <Firebase ID token>`.

| Método | Ruta | Rol mínimo | Descripción |
| --- | --- | --- | --- |
| GET | `/products?q=&limit=` | employee | Recientes o búsqueda por nombre/marca/código |
| GET | `/products/:barcode` | employee | Detalle + stock; registra una visita |
| GET | `/stock/:barcode` | employee | Stock de un producto |
| GET | `/stock/low-stock?threshold=&limit=` | supervisor | Productos bajo el umbral |
| PUT | `/stock/:barcode` | admin | Fija la cantidad (entero ≥ 0) |
| GET | `/dashboard` | employee | Resumen, más consultados y stock bajo (supervisor+) |
| GET | `/users/me` | employee | Perfil y rol actuales |
| GET | `/users` | admin | Listado de usuarios |
| POST | `/users` | admin | Provisión de cuenta + enlace de acceso |
| PATCH | `/users/:uid/role` | admin | Cambio de rol con protecciones |
| GET | `/health`, `/ready` | — | Liveness y readiness |

Formato de respuesta: `{ "data": … }`; errores: `{ "error": { code, message, details?, requestId } }`.
Referencia completa con ejemplos en [docs/10-api.md](docs/10-api.md).

## Roles

| Rol | Consultar producto/stock | Ver stock bajo | Modificar stock | Gestionar usuarios |
| --- | :---: | :---: | :---: | :---: |
| Employee | ✅ | — | — | — |
| Supervisor | ✅ | ✅ | — | — |
| Admin | ✅ | ✅ | ✅ | ✅ |

La jerarquía se aplica en el backend (`ROLE_RANK`); la UI solo oculta lo que el usuario no
puede usar. Ocultar una pestaña nunca es la única defensa.

## Calidad

```bash
# Backend
cd backend
npm run lint && npm run typecheck && npm test && npm run build

# Móvil
cd mobile
npm run lint && npm run typecheck
npx expo export --platform android --output-dir /tmp/expo-export
```

Estado verificado en este repositorio:

- Backend: 54 tests (Vitest + Supertest) sobre auth, roles, productos, stock, dashboard, usuarios, configuración y OpenFoodFacts.
- Backend: `tsc --noEmit`, ESLint y build de producción sin errores.
- Móvil: `tsc --noEmit`, ESLint y bundle Android de Expo correctos.
- Docker: `docker compose --profile build config -q` valida el stack (`api`, `mobile`,
  `mobile-bundle`). En la auditoría actual no se ejecutaron el build ni el arranque de los
  contenedores, ni la app en un dispositivo/emulador Android con Firebase real.

## Documentación

1. [Arquitectura](docs/01-arquitectura.md)
2. [Estructura de carpetas](docs/02-estructura-carpetas.md)
3. [Modelo Firestore](docs/03-modelo-firestore.md)
4. [Diseño de pantallas](docs/04-pantallas.md)
5. [Navegación](docs/05-navegacion.md)
6. [Buenas prácticas](docs/06-buenas-practicas.md)
7. [Dockerización](docs/07-docker.md)
8. [Roadmap de 2 semanas](docs/08-roadmap.md)
9. [Despliegue](docs/09-despliegue.md)
10. [Referencia de API](docs/10-api.md)
11. [Migrar el proyecto a la VM con Copilot](docs/11-migrar-a-vm.md)
12. [Auditoría del MVP](docs/12-auditoria.md)

## Limitaciones conocidas (MVP)

- El catálogo no se precarga completo: se llena con las búsquedas y consultas del equipo.
  La evolución natural es un ETL nocturno de OpenFoodFacts (ver roadmap).
- La búsqueda de texto depende de OpenFoodFacts; si la API externa cae, solo se buscan
  productos ya cacheados.
- No hay escáner de códigos de barras en la app: el código se introduce a mano.
- El rate limit es en memoria por instancia; con varias réplicas requiere Redis.
- Sin pantalla de alta de usuarios en la app: la provisión se hace vía API/backoffice.
- `stock` guarda la última escritura; el histórico/auditoría está en los logs del backend
  (extensión prevista: colección `stockHistory`).
- `npm audit` en `mobile` reporta avisos altos en dependencias **de las herramientas de
  build de Expo** (`@expo/cli` → `node-forge`/`zod`). No afectan al código que se ejecuta en
  el dispositivo y `npm audit fix --force` degradaría Expo a la versión 44; se corrige al
  actualizar el SDK cuando Expo publique la dependencia parcheada. El backend no tiene
  vulnerabilidades en dependencias de producción (`npm audit --omit=dev`).

## Marca y uso

Proyecto de uso interno. Los logos e imágenes de Carrefour son marcas registradas de su
titular; sustituye los assets de `mobile/assets` por los corporativos antes de publicar.
