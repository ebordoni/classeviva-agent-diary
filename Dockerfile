# ─────────────────────────────────────────────
# Stage 1: build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifest root e packages necessari
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/bot/package.json  ./packages/bot/

# Installa tutto (incluse devDependencies per la build TypeScript)
RUN npm ci

# Copia i sorgenti e compila
COPY packages/core/src       ./packages/core/src
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/bot/src        ./packages/bot/src
COPY packages/bot/tsconfig.json  ./packages/bot/

RUN npm run build:core && npm run build:bot

# Rimuovi le devDependencies per il runtime
RUN npm prune --omit=dev

# ─────────────────────────────────────────────
# Stage 2: runtime
# ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Copia node_modules già pronti (nessun modulo nativo da compilare)
COPY --from=builder /app/node_modules        ./node_modules
COPY --from=builder /app/package.json        ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/bot/package.json  ./packages/bot/

# Copia i file compilati
COPY --from=builder /app/packages/core/dist  ./packages/core/dist
COPY --from=builder /app/packages/bot/dist   ./packages/bot/dist

# Directory per il volume persistente (cache JSON)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV CACHE_DB_PATH=/data/cache.json

CMD ["node", "packages/bot/dist/index.js"]
