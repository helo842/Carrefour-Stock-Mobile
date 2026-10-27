# syntax=docker/dockerfile:1.7

# ---- Dependencies -----------------------------------------------------------
# Una sola capa con las dependencias del lockfile. Las dos etapas siguientes
# comparten esta imagen base, de modo que npm ci se ejecuta una única vez.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- Servidor de desarrollo (Metro + Expo) ----------------------------------
# El código no se copia a la imagen: docker-compose monta ./mobile sobre /app
# y reserva /app/node_modules en un volumen con nombre, de forma que los binarios
# del contenedor nunca se mezclan con los de la máquina anfitriona.
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 8081
CMD ["node", "./node_modules/expo/bin/cli", "start", "--host", "lan", "--port", "8081"]

# ---- Bundle de Android (JS + assets) ----------------------------------------
# Genera ./mobile/dist (montado desde el host) sin necesitar Node en la máquina.
#   docker compose --profile build run --rm mobile-bundle
FROM deps AS bundle
ENV NODE_ENV=production \
    CI=1
CMD ["node", "./node_modules/expo/bin/cli", "export", "--platform", "android", "--output-dir", "dist"]
