# 11 · Migrar el proyecto a la máquina virtual (VS Code + Copilot)

Este documento recoge el **prompt para VS Code Copilot (modo agente)** que copia la carpeta
del proyecto desde tu equipo Windows hasta la máquina virtual y deja el entorno listo para
ejecutar, además del método manual equivalente.

## 1. Datos que debes rellenar antes de pegar el prompt

| Dato | Ejemplo |
| --- | --- |
| Origen (carpeta abierta en VS Code) | `C:\Users\hector\Desktop\Proyecto-Carrefour` |
| IP de la VM | `192.168.56.10` |
| Usuario SSH | `dev` |
| Clave SSH | `C:\Users\hector\.ssh\id_ed25519` |
| Destino en la VM | `/home/dev/carrefour-stock-mobile` |
| Sistema de la VM | Ubuntu 22.04 (WSL 2 / Hyper-V / VirtualBox / VMware) |

## 2. Prompt para Copilot

Abre el proyecto en VS Code, abre Copilot en **modo agente** y pega este bloque completo
(sustituyendo los datos entre `<…>`):

```text
Actúa como ingeniero de DevTools. Copia el proyecto "Carrefour Stock Mobile" desde esta
máquina Windows hasta mi máquina virtual y déjalo listo para ejecutar. No modifiques,
formatees ni borres código, y no toques nada fuera de la carpeta de destino.

DATOS
- Origen (carpeta del proyecto, abierta ahora en VS Code): <RUTA_ORIGEN>
- VM: <SO> · IP <IP_VM> · usuario SSH <USUARIO_VM>
- Clave SSH: <RUTA_CLAVE>
- Destino en la VM: <RUTA_DESTINO>
- Acceso: SSH desde esta terminal con `ssh -i <RUTA_CLAVE> <USUARIO_VM>@<IP_VM>`

PASOS
1. Verifica el origen: en la carpeta actual deben existir backend/, mobile/, firebase/,
   docs/, docker-compose.yml y README.md. Si no es así, detente y dímelo.
2. Comprueba el acceso a la VM: `ssh -i <RUTA_CLAVE> -o BatchMode=yes <USUARIO_VM>@<IP_VM> echo ok`.
3. Transfiere el proyecto con este método (y repórtalo):
     cd <RUTA_ORIGEN>
     tar -czf - \
       --exclude=node_modules --exclude=.expo --exclude=.tools \
       --exclude=dist --exclude=coverage --exclude=.freebuff \
       --exclude=.env --exclude=.env.local --exclude=.env.production \
       --exclude=.dev.vars --exclude='*.log' --exclude='*.jks' --exclude='*.keystore' \
       . | ssh -i <RUTA_CLAVE> <USUARIO_VM>@<IP_VM> \
         "mkdir -p <RUTA_DESTINO> && tar -xzf - -C <RUTA_DESTINO>"
   Si `tar` no está disponible, usa `scp -r` con los mismas exclusiones, o `rsync -av`
   si existe en esta terminal. Si la VM es Windows, usa en su lugar
   `robocopy <RUTA_ORIGEN> \\<IP_VM>\<recurso> /MIR /XD node_modules .expo .tools /XF .env .env.*`.
4. NUNCA transfieras secretos: ni `.env`, ni `.env.local`, ni JSON de cuenta de servicio de
   Firebase, ni claves/ficheros `.jks`/`.keystore`. Los `.env` se crearán en la VM a partir
   de los `.env.example`. Si encuentras alguno, no lo copies y avísame.
5. Verifica la integridad de la copia:
   - `ls <RUTA_DESTINO>` muestra backend/, mobile/, firebase/, docs/, docker-compose.yml, README.md.
   - `sha256sum backend/package-lock.json mobile/package-lock.json` coincide en origen y destino.
   - No existe ningún `node_modules` ni ningún `.env` real en el destino.
6. Prepara la VM si faltan herramientas (solo instala lo que falte):
   - `node -v` → 24. Si no: instala nvm y `nvm install 24`.
   - `docker --version` y `docker compose version` → Docker Compose 2.24 o superior.
   - `cd <RUTA_DESTINO>/backend && npm ci` y `cd <RUTA_DESTINO>/mobile && npm ci`.
   - `cd <RUTA_DESTINO> && docker compose config -q` debe terminar sin errores.
7. No hagas commits, no empujes a ningún remoto y no borres ficheros que ya existieran en
   el destino.
8. Informa al final: método de transferencia usado, número de ficheros copiados, ruta de
   destino, versiones instaladas y cualquier incidencia.
```

## 3. Método manual equivalente (sin Copilot)

```bash
# Desde Git Bash / WSL en Windows
cd /c/Users/<tu-usuario>/Desktop/Proyecto-Carrefour
tar -czf - --exclude=node_modules --exclude=.expo --exclude=.tools \
  --exclude=dist --exclude=coverage --exclude=.env --exclude=.env.local \
  --exclude='*.log' . | ssh <USUARIO_VM>@<IP_VM> "mkdir -p <RUTA_DESTINO> && tar -xzf - -C <RUTA_DESTINO>"

# Comprobación
ssh <USUARIO_VM>@<IP_VM> "ls <RUTA_DESTINO> && sha256sum <RUTA_DESTINO>/mobile/package-lock.json"
sha256sum mobile/package-lock.json
```

Si no hay SSH (VM con carpeta compartida), copia la carpeta con el explorador y después
elimina en la VM los directorios que no deben viajar: `node_modules`, `.expo`, `.tools`,
`dist`, `coverage`.

Otra opción, cuando el repo tenga remoto: `git push` desde Windows y `git clone` en la VM.

## 4. Checklist tras la migración

1. `cd <RUTA_DESTINO>/backend && cp .env.example .env` → credenciales de Firebase.
2. `cd <RUTA_DESTINO>/mobile && cp .env.example .env` → `EXPO_PUBLIC_API_URL=http://<IP_VM>:8080` y la config de la app web.
3. `printf 'REACT_NATIVE_PACKAGER_HOSTNAME=<IP_VM>\n' > <RUTA_DESTINO>/.env`.
4. `docker compose up --build -d` → `docker compose ps` con `api` en `healthy`.
5. Arranca la app: ver [README.md](../README.md) y [docs/07-docker.md](07-docker.md).
6. Abre el puerto 8081 en el firewall de la VM si vas a usar un móvil físico con Expo Go.
