# 07 · Dockerización del proyecto (API + app móvil)

## 1. Imagen de la API

`backend/Dockerfile` usa tres etapas para que la imagen final no contenga TypeScript, tests
ni dependencias de desarrollo:

| Etapa | Base | Qué hace |
| --- | --- | --- |
| `deps` | `node:24-alpine` | `npm ci` reproducible desde el lockfile |
| `build` | `node:24-alpine` | Compila `src` → `dist` y poda devDependencies |
| `runner` | `node:24-alpine` | Copia `dist` + `node_modules` de producción, usuario no root |

Decisiones de runtime:

- `USER api` (uid 1001) → no root.
- `HEALTHCHECK` contra `/health` con `wget` (incluido en Alpine).
- `NODE_ENV=production`, puerto 8080.
- Sin `npm` en el CMD: `node dist/server.js` y apagado ordenado por SIGTERM.

Construir y ejecutar:

```bash
cd backend
docker build -t carrefour-stock-api:1.0.0 .
docker run --rm -p 8080:8080 --env-file .env carrefour-stock-api:1.0.0
```

`.dockerignore` excluye `node_modules`, `dist`, `tests`, `.env` y documentación para
no inflar el contexto ni filtrar secretos (`src` sí viaja: es lo que compila la etapa `build`).

## 2. Docker Compose (todo el proyecto)

`docker-compose.yml` (raíz) levanta el proyecto completo:

| Servicio | Imagen | Puerto | Qué hace |
| --- | --- | --- | --- |
| `api` | `carrefour-stock-api:local` | 8080 | API Express endurecida (solo lectura, no root) |
| `mobile` | `carrefour-stock-mobile:dev` | 8081 | Metro/Expo dev server de la app Android |
| `mobile-bundle` (perfil `build`) | `carrefour-stock-mobile-bundle:local` | — | One-shot que genera `mobile/dist` (bundle Android) |

```yaml
services:
  api:
    build: {context: ./backend, dockerfile: Dockerfile}
    env_file: [{path: ./backend/.env, required: false}]
    environment: {NODE_ENV: production, PORT: 8080}
    ports: ['8080:8080']
    read_only: true
    tmpfs: ['/tmp']
    security_opt: ['no-new-privileges:true']
    cap_drop: ['ALL']
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:8080/health']

  mobile:
    build: {context: ./mobile, dockerfile: Dockerfile, target: dev}
    ports: ['8081:8081']
    environment:
      REACT_NATIVE_PACKAGER_HOSTNAME: ${REACT_NATIVE_PACKAGER_HOSTNAME:-localhost}
    volumes:
      - ./mobile:/app                     # código en vivo (hot reload)
      - mobile_node_modules:/app/node_modules
    depends_on: [api]

  mobile-bundle:
    profiles: ['build']                   # docker compose --profile build …
    build: {context: ./mobile, dockerfile: Dockerfile, target: bundle}
    volumes:
      - ./mobile:/app
      - mobile_node_modules:/app/node_modules

volumes:
  mobile_node_modules:
```

Uso:

```bash
cp backend/.env.example backend/.env      # credenciales del Admin SDK
cp mobile/.env.example mobile/.env        # URL de la API + config de Firebase
# IP LAN de esta máquina: es la que verá Expo Go en el QR
printf 'REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.50\n' > .env

docker compose up --build -d              # api + mobile
docker compose ps                         # api debe quedar "healthy"
docker compose logs -f api
docker compose logs -f mobile             # busca "exp://<IP>:8081"
curl http://localhost:8080/health
docker compose --profile build run --rm mobile-bundle   # genera ./mobile/dist
docker compose down
```

Notas del servicio `mobile`:

- **El código no va dentro de la imagen**: `./mobile` se monta sobre `/app`, así que editar
  en la VM o en el host recarga la app al instante.
- `node_modules` vive en el volumen `mobile_node_modules`, inicializado desde la imagen; así
  los binarios del contenedor (Linux) no se sustituyen por los del host (p. ej. Windows).
  Si cambias `mobile/package.json`, renueva el volumen con
  `docker compose down -v && docker compose up -d --build` (el flag `-v` elimina el volumen
  `mobile_node_modules`, que se recrea desde la imagen).
- `REACT_NATIVE_PACKAGER_HOSTNAME` define el host que Metro anuncia. Sin él, Expo Go
  recibiría `exp://172.17.0.x:8081` (la IP interna del contenedor) y no conectaría.
- Un contenedor **no puede ejecutar la app**: el APK lo ejecuta el móvil o el emulador. En
  Docker se sirve el bundle de Metro (`8081`) y se genera el bundle de Android
  (`mobile-bundle`). El emulador de la VM descarga desde `exp://10.0.2.2:8081`.
- `env_file` con `required: false` permite arrancar sin `.env` (la app muestra su pantalla
  de configuración y la API terminará en `unhealthy`); en cualquier caso, copia los
  ejemplos antes de dar por bueno el entorno.

`read_only` funciona porque la API solo escribe en stdout; `/tmp` queda como tmpfs para
librerías que lo necesiten. `init: true` evita procesos zombis y propaga señales.

Requisitos: Docker Engine + **Docker Compose ≥ 2.24** (por la sintaxis
`env_file: [{path, required}]` de Docker Desktop 24.0 o superior).

## 3. Configuración y secretos

Variables (todas documentadas en `backend/.env.example`):

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | recomendada | Proyecto Firebase |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | según entorno | JSON de cuenta de servicio en **una línea** |
| `CORS_ORIGINS` | producción | Dominios permitidos, separados por coma |
| `LOW_STOCK_THRESHOLD` | no (10) | Umbral por defecto |
| `RATE_LIMIT_*` | no | Límite por IP |
| `OFF_*` | no | Base URL, User-Agent, timeout y TTL |

Buenas prácticas:

- **Nunca** hornees el JSON en la imagen ni lo subas al repo.
- En Docker local puede ir en `backend/.env` (ignorado por git).
- En producción usa Secret Manager / SSM y monta el secreto como variable.
- Alternativa sin JSON: `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un fichero montado, o
  Workload Identity (Cloud Run/GKE) sin credenciales.
- `CORS_ORIGINS` vacío permite cualquier origen (útil en desarrollo); configúralo siempre en
  producción.

## 4. Verificación tras arrancar

```bash
docker compose ps                      # api: healthy, mobile: running
curl -s localhost:8080/health | jq
curl -s localhost:8080/ready | jq      # comprueba Firestore
curl -s -o /dev/null -w '%{http_code}\n' localhost:8080/api/v1/products   # 401
docker compose logs mobile | grep 'exp://'   # URL que se abre en Expo Go
curl -sI localhost:8081/index.bundle?platform=android | head -1  # Metro responde
```

Si `/ready` devuelve 503:

1. Revisa logs: `docker compose logs api`.
2. Comprueba `FIREBASE_PROJECT_ID`, credenciales y conectividad.
3. Verifica que la cuenta de servicio tiene acceso a Firestore/Auth.
4. No interpretes un contenedor “Up” como servicio sano: el healthcheck manda.

## 5. Imagen y despliegue

- Etiqueta con versión (`carrefour-stock-api:1.0.0`) y publica en el registry corporativo
  (Artifact Registry, GHCR, ECR…).
- Prueba la imagen en staging con las mismas variables que producción.
- Cloud Run: usa la imagen o `gcloud run deploy --source backend` (detecta el Dockerfile).
  Configura `PORT=8080`, probes a `/health`, concurrencia y mínimo de instancias según uso.
- VPS: `docker compose pull && docker compose up -d` detrás de Nginx/Caddy con TLS.
- Multi-arch (si hay runners ARM): `docker buildx build --platform linux/amd64,linux/arm64`.

## 6. Trabajar desde una VM de desarrollo (VS Code Remote / WSL)

El repo funciona igual en local o en una VM Linux. Para copiar la carpeta del proyecto desde
Windows hasta la VM, usa el prompt de agente listo para VS Code Copilot de
[docs/11-migrar-a-vm.md](11-migrar-a-vm.md) (incluye exclusiones y verificación de integridad).

1. Si la carpeta aún no está en la VM, transfiérela con ese prompt; después ábrela con VS Code Remote.
2. Instala Node 24 (`nvm install 24 && nvm use 24`) y Docker Engine + Compose.
3. Reenvía puertos desde VS Code: **8080** (API) y **8081** (Metro/Expo).
4. Para el emulador Android de la VM, `EXPO_PUBLIC_API_URL=http://10.0.2.2:8080`.
5. Con un móvil físico, apunta a la IP LAN de la VM o usa `npx expo start --tunnel`
   (el tunnel solo cubre el bundler; la API debe ser accesible por red o por un proxy).
6. Firewall: abre 8081/19000-19002 si Expo Go no conecta; evita exponer la API sin TLS.

Con Docker Compose la API es idéntica en la VM y en producción; no hay “funciona en mi
máquina” más allá de las credenciales Firebase.

## 7. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| Contenedor reinicia en bucle | JSON de credenciales inválido o env faltante | `docker compose logs api`; validar JSON |
| `/ready` 503 | Sin acceso a Firestore / proyecto incorrecto | Revisar IAM y `FIREBASE_PROJECT_ID` |
| 429 en todas las llamadas | Rate limit detrás de proxy sin `trust proxy` | La API ya activa `trust proxy` en producción |
| CORS bloqueado | Origen no listado | Añadir a `CORS_ORIGINS` |
| Imagen grande | Se copió `node_modules` de desarrollo | Respetar `.dockerignore` y etapa `runner` |
| Healthcheck unhealthy pero API responde | `wget` no encuentra `/health` por puerto distinto | Ajustar `PORT` y el healthcheck |
