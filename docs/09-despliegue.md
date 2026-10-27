# 09 · Despliegue

## 1. Entornos

| Entorno | Firebase | API | App |
| --- | --- | --- | --- |
| Desarrollo | `carrefour-stock-dev` | local (`:8080`) | Expo Go / emulador |
| Staging | `carrefour-stock-staging` | Cloud Run staging | APK preview (EAS) |
| Producción | `carrefour-stock-prod` | Cloud Run prod | AAB (Play internal → producción) |

Nunca compartas proyecto Firebase entre entornos: el seed y las pruebas escribirían datos
reales.

## 2. Firebase

### 2.1 Crear el proyecto

1. Firebase Console → crear proyecto (p. ej. `carrefour-stock-prod`).
2. **Authentication** → Sign-in method → habilitar **Correo electrónico/contraseña**.
   Desactiva el registro público si no lo necesitas (las cuentas se provisionan por API).
3. **Firestore** → crear base de datos en la región corporativa (p. ej. `europe-west1`),
   modo producción.
4. **Configuración del proyecto → Cuentas de servicio** → generar clave JSON para el backend.
   Guárdala fuera del repo.
5. **Configuración del proyecto → Tus apps → Web** → copiar `apiKey`, `authDomain`,
   `projectId`, `appId` para la app móvil (son identificadores públicos).

### 2.2 Desplegar reglas e índices

```bash
npm i -g firebase-tools
firebase login
firebase use --add          # selecciona el proyecto
firebase deploy --only firestore:rules,firestore:indexes
```

Verifica que un cliente sin privilegios **no** puede leer:

```js
// En una consola web con la config del proyecto:
// firebase.firestore().collection('stock').get() debe fallar con permission-denied
```

### 2.3 Primer administrador y equipo

```bash
cd backend
npm run bootstrap-admin -- --email admin@carrefour.com --name "Admin Carrefour"
```

El script crea el usuario en Auth si no existe, escribe `users/{uid}` con rol `admin` e
imprime un enlace de restablecimiento de contraseña. Después, el admin puede crear al resto:

```bash
curl -X POST "$API/api/v1/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Elena Empleada","email":"elena@carrefour.com","role":"employee"}'
```

La respuesta incluye `passwordResetLink`: compártelo por canal seguro (un solo uso).

### 2.4 Operación

- Activa **Point-in-Time Recovery** y exportaciones programadas a Cloud Storage.
- Revisa las alertas de cuota y de errores de reglas.
- Mantén las reglas denegando todo el acceso de cliente.
- Rota la cuenta de servicio si se expone y limita sus roles IAM a Firestore/Auth.

## 3. Backend en producción

### 3.1 Opción recomendada: Cloud Run

```bash
gcloud auth login
gcloud config set project carrefour-stock-prod

# Secreto con la cuenta de servicio (nunca en texto plano en el comando)
gcloud secrets create firebase-service-account --data-file=./service-account.json

gcloud run deploy carrefour-stock-api \
  --source ./backend \
  --region europe-west1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars NODE_ENV=production,CORS_ORIGINS=https://tu-dominio.example \
  --set-secrets FIREBASE_SERVICE_ACCOUNT_JSON=firebase-service-account:latest
```

- `--source` detecta el `Dockerfile` y construye la imagen con Cloud Build.
- La cuenta de servicio de ejecución necesita permisos sobre Firestore y Firebase Auth
  (o usa Workload Identity y omite el JSON).
- Configura probes HTTP a `/health` y timeout de 30 s.
- Con `min-instances=0` hay cold start; si la tienda lo nota, sube a 1.
- El rate limit en memoria es por instancia; con varias réplicas, añade Redis.

### 3.2 Alternativa: VPS con Docker

```bash
git clone <repo> /srv/carrefour-stock && cd /srv/carrefour-stock
cp backend/.env.example backend/.env    # configura secretos con permisos 600
docker compose up -d --build
```

Coloca Nginx/Caddy delante con TLS y limita el acceso al puerto 8080. Programa backups y
reinicio automático (`restart: unless-stopped` ya está configurado).

### 3.3 Verificación post-despliegue

```bash
API=https://api.tu-dominio.example
curl -fsS $API/health
curl -fsS $API/ready
curl -s -o /dev/null -w '%{http_code}\n' $API/api/v1/products          # 401
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $EMPLEADO" \
  $API/api/v1/users                                                    # 403
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $ADMIN" \
  $API/api/v1/users                                                    # 200
```

## 4. App Android con EAS

### 4.1 Configuración

```bash
npm i -g eas-cli
cd mobile
eas login
eas init            # vincula el proyecto Expo (genera projectId)
eas build:configure # ya existe eas.json; este comando puede omitirse
```

`eas.json` incluye:

- `preview`: APK interno para QA y tiendas piloto.
- `production`: AAB con incremento automático de versión.

### 4.2 Variables de entorno en builds

Expo embute `EXPO_PUBLIC_*` **en tiempo de build**. Define un juego por perfil en EAS
(Environment variables) o en `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.tu-dominio.example",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "carrefour-stock-staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.tu-dominio.example",
        "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "carrefour-stock-prod"
      }
    }
  }
}
```

Las claves de Firebase son públicas (no son secretos), pero la URL de API debe ser la del
entorno correcto. **Cambiar una variable exige un nuevo build**, no basta con reiniciar.

### 4.3 Compilar y distribuir

```bash
cd mobile
eas build -p android --profile preview     # APK para QA
eas build -p android --profile production  # AAB para Play
```

- **QA interno:** descarga el APK desde el enlace de EAS e instálalo en dispositivos de
  tienda; prueba con las tres cuentas (employee/supervisor/admin).
- **Play Console:** crea la app, sube el AAB al canal de **prueba interna**, añade testers y
  promociona a producción tras la validación.
- **Firma:** EAS gestiona el keystore; guárdalo/exporta y restringe el acceso. No subas
  keystores al repo.
- **Versionado:** `version` en `app.json` es la versión visible; `versionCode` lo incrementa
  EAS con `autoIncrement`.

### 4.4 Checklist de release

- [ ] Variables de entorno del perfil correctas (API y proyecto Firebase).
- [ ] Reglas Firestore desplegadas y verificadas.
- [ ] Backend `/ready` en verde y migraciones/seed no ejecutados en producción.
- [ ] Matriz de roles probada en el APK real.
- [ ] Textos y assets de marca revisados.
- [ ] Política de privacidad y ficha de Play completa (uso interno).
- [ ] Versión y notas de release.
- [ ] Plan de rollback: conservar el AAB anterior y la imagen anterior del backend.

## 5. Rollback

- **Backend:** Cloud Run permite desplegar una revisión anterior al instante
  (`gcloud run services update-traffic ... --to-revisions=<rev>=100`). En VPS,
  `docker compose` con la etiqueta anterior.
- **App:** Play Console permite detener el rollout; los usuarios conservan la versión
  instalada. No se puede “desinstalar” una versión, así que prueba en internal testing.
- **Datos:** las escrituras de stock son absolutas; si un cambio es erróneo, un admin fija
  el valor correcto. Para el histórico, restaurar PITR es la última opción.

## 6. Monitorización mínima

- Uptime check a `/health` cada minuto.
- Alerta si `/ready` falla 2 veces seguidas.
- Alerta de 5xx > 1 % y p95 > 1 s durante 5 min.
- Panel de errores 401/403/429 para detectar configuración o abuso.
- Revisión semanal de logs `Stock updated` / `User role updated`.

## 7. Coste orientativo

| Servicio | Uso MVP | Coste esperado |
| --- | --- | --- |
| Cloud Run | 1 instancia 512 MiB, tráfico bajo | ~0–10 €/mes (free tier) |
| Firestore | < 100k lecturas/día | ~0–5 €/mes |
| Firebase Auth | < 10k usuarios | Gratis en el plan Spark/Blaze bajo umbral |
| EAS Build | 2–5 builds/mes | Plan gratuito/limitado o suscripción |
| Artifact Registry | 1 imagen | Céntimos |

El coste dominante suele ser el tiempo de ingeniería y, a escala, OpenFoodFacts (gratuito
pero limitado). Un ETL propio de catálogo reduce dependencia externa.
