ARG BUILD_FROM=node:20-alpine
FROM ${BUILD_FROM}

RUN apk add --no-cache bash jq

WORKDIR /build

# I sorgenti vengono copiati dalla cartella src/ dell'add-on
# (vedi README: esegui scripts/prepare-addon.sh prima di copiare su HA)
COPY src/ .

# Installa le dipendenze e compila
RUN npm ci
RUN npm run build:core && npm run build:bot
RUN npm prune --omit=dev

# Copia solo i file necessari nella cartella finale
RUN mkdir -p /app && \
    cp -r node_modules /app/ && \
    cp package.json /app/ && \
    mkdir -p /app/packages/core && \
    cp -r packages/core/dist /app/packages/core/dist && \
    cp packages/core/package.json /app/packages/core/ && \
    mkdir -p /app/packages/bot && \
    cp -r packages/bot/dist /app/packages/bot/dist && \
    cp packages/bot/package.json /app/packages/bot/

# Script di avvio (legge le opzioni da HA)
COPY run.sh /run.sh
RUN chmod +x /run.sh

WORKDIR /app
CMD ["/run.sh"]
