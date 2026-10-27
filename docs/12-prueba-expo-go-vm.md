# 12 · Probar la app con Expo Go desde una VM

Esta guía describe una configuración de desarrollo para probar la app en un teléfono
cuando el proyecto y la API se ejecutan en una máquina virtual remota. Expo Go carga
la app mediante el túnel de Expo; la API se publica temporalmente mediante Cloudflare
Quick Tunnel.

> **Solo para pruebas:** Cloudflare Quick Tunnel proporciona una URL pública temporal
> y no ofrece garantía de disponibilidad. No lo uses con datos reales ni para producción.
> Detén el túnel al terminar y no compartas su URL.

## 1. Requisitos y Firebase

- Node.js y npm instalados en la VM.
- Expo Go instalado en el teléfono y una cuenta de Expo.
- Un proyecto Firebase de desarrollo con **Authentication (correo/contraseña)** y
  **Firestore** habilitados.
- Una app **web** registrada en el proyecto Firebase. La app móvil usa esos valores
  para Firebase Authentication; el acceso a Firestore pasa exclusivamente por el backend.

En la raíz del proyecto, inicia sesión con Firebase CLI, selecciona el proyecto de
desarrollo y despliega las reglas:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

Comprueba que seleccionaste el mismo proyecto cuyo ID configurarás en los dos `.env`.
Las reglas de `firebase/firestore.rules` bloquean el acceso directo desde clientes; no
las abras para que la app funcione.

## 2. Configurar los archivos `.env`

Los archivos `.env` son locales y no se deben subir a Git.

### Backend: `backend/.env`

Crea una copia de `backend/.env.example` si aún no existe:

```bash
cd ~/Carrefour-Stock-Mobile/backend
cp .env.example .env
```

Configura:

```env
NODE_ENV=development
PORT=8080
FIREBASE_PROJECT_ID=ID_DEL_PROYECTO_FIREBASE
FIREBASE_SERVICE_ACCOUNT_JSON='JSON_COMPLETO_DE_LA_CUENTA_DE_SERVICIO_EN_UNA_LINEA'
```

`FIREBASE_SERVICE_ACCOUNT_JSON` debe contener el JSON completo de una cuenta de servicio
del mismo proyecto. Debe ser JSON válido en una sola línea; conserva los `\n` escapados
de `private_key`. El JSON contiene una clave privada: no lo pongas en el `.env` móvil,
no lo compartas y no lo subas a GitHub. Para entornos que ya tengan Application Default
Credentials configuradas se puede usar esa identidad y dejar vacía la variable.

Si aparece `FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido`, revisa que el valor esté
completo, entre comillas simples y en una única línea. No imprimas ni compartas su
contenido para diagnosticarlo.

### Móvil: `mobile/.env`

Crea una copia de `mobile/.env.example` si aún no existe:

```bash
cd ~/Carrefour-Stock-Mobile/mobile
cp .env.example .env
```

Rellena las variables con la configuración **Config** de la app web de Firebase y deja
inicialmente una URL temporal:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ID_DEL_PROYECTO_FIREBASE
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_API_URL=https://URL_TEMPORAL_DE_CLOUDFLARE
```

`EXPO_PUBLIC_FIREBASE_PROJECT_ID` debe coincidir con `FIREBASE_PROJECT_ID`. Los valores
de configuración de cliente no sustituyen la cuenta de servicio y no otorgan acceso
directo a Firestore.

## 3. Arrancar el backend

En una primera terminal de la VM:

```bash
cd ~/Carrefour-Stock-Mobile/backend
npm ci
npm run dev
```

Deja la terminal abierta. En otra terminal, comprueba el backend:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

`/health` comprueba que la API está viva y `/ready` que está lista. Si no responden,
resuelve primero el error del backend o de las credenciales Firebase.

## 4. Crear el túnel temporal de la API

En una terminal separada, descarga `cloudflared` si aún no está instalado. Para una VM
Linux `x86_64`:

```bash
mkdir -p "$HOME/.local/bin"
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o "$HOME/.local/bin/cloudflared"
chmod +x "$HOME/.local/bin/cloudflared"
```

Para comprobar la arquitectura de la VM:

```bash
uname -m
```

Inicia el túnel hacia la API:

```bash
"$HOME/.local/bin/cloudflared" tunnel --url http://localhost:8080
```

Déjalo ejecutándose. Copia la URL `https://...trycloudflare.com` que muestra. Los
mensajes informativos sobre la ausencia de archivo de configuración o el búfer QUIC
no necesariamente indican un fallo; verifica la conectividad con:

```bash
curl https://URL_TEMPORAL_DE_CLOUDFLARE/health
```

Abre también esa URL terminada en `/health` desde el navegador del teléfono. Si no
responde, confirma que el backend sigue activo y que el túnel está conectado. No uses
`localhost:8080` como URL desde el teléfono: allí `localhost` señalaría al propio móvil.

Actualiza `EXPO_PUBLIC_API_URL` en `mobile/.env` con la URL base, sin `/health`. Cada
nuevo Quick Tunnel genera una URL distinta; si cambia, actualiza el `.env` y reinicia
Expo.

## 5. Arrancar Expo Go por túnel

Inicia sesión en Expo una vez:

```bash
cd ~/Carrefour-Stock-Mobile/mobile
npx expo login
```

Si no tienes cuenta, crea una gratuita en [expo.dev](https://expo.dev). Luego inicia
Metro con el túnel:

```bash
npx expo start --tunnel --clear
```

Espera a que Metro muestre el QR y ábrelo con Expo Go. Si el comando indica que no has
iniciado sesión, vuelve a ejecutar `npx expo login`. Mantén abiertas las terminales del
backend, `cloudflared` y Expo mientras pruebas.

El túnel de Expo solo permite que Expo Go descargue el bundle de JavaScript. La variable
`EXPO_PUBLIC_API_URL` debe apuntar al túnel de Cloudflare de la API; son dos túneles
distintos.

## 6. Crear el primer administrador y probar

Una vez que el backend puede autenticarse con Firebase, crea el usuario administrador
desde otra terminal:

```bash
cd ~/Carrefour-Stock-Mobile/backend
npm run bootstrap-admin -- --email TU_CORREO --name "Tu nombre"
```

Usa el enlace de restablecimiento que imprime el script para establecer la contraseña y
después inicia sesión en la app. Si el backend no tiene credenciales válidas, el script
fallará antes de crear el usuario. Comparte el enlace de restablecimiento únicamente
con su destinatario.

Opcionalmente, carga productos de demostración **solo en Firebase de desarrollo**:

```bash
npm run seed
```

El seed escribe y actualiza cantidades de stock de demostración; no lo ejecutes en
producción.

## 7. Cerrar la sesión de desarrollo

Al terminar:

1. Detén `cloudflared`, Expo y el backend con `Ctrl+C` en cada terminal.
2. No reutilices ni publiques la URL temporal del túnel.
3. Mantén los `.env` fuera de Git. Antes de publicar el repositorio, revisa los archivos
   preparados para commit y confirma que no incluyen credenciales, claves privadas ni
   archivos JSON de cuentas de servicio.

## Solución de problemas

| Síntoma | Comprobación |
| --- | --- |
| `firebase: command not found` | Usa `npx firebase-tools ...` desde la raíz del proyecto. |
| JSON de cuenta de servicio inválido | Revisa que el JSON esté completo, en una sola línea y con los `\n` escapados; no lo compartas para depurar. |
| Cloudflare no responde | Comprueba `curl http://localhost:8080/health`, deja el backend y el túnel ejecutándose y vuelve a probar la URL temporal. |
| Expo no puede crear el túnel firmado | Ejecuta `npx expo login` y luego `npx expo start --tunnel --clear`. |
| La app abre pero no conecta con la API | Verifica `EXPO_PUBLIC_API_URL` en `mobile/.env`, prueba `/health` desde el móvil y reinicia Expo después de cambiar el `.env`. |
| La app abre pero el inicio de sesión falla | Comprueba Firebase Authentication, el ID de proyecto y las credenciales del backend; crea el administrador con `bootstrap-admin`. |

Nunca pegues el contenido de ninguno de los `.env` en una incidencia, chat o repositorio.
