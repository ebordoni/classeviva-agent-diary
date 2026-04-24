ARG BUILD_FROM
FROM ${BUILD_FROM}

# Installa Node.js 20 e strumenti necessari
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash jq curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY src/ .

# Installa le dipendenze e compila
RUN npm install --workspace=packages/core --workspace=packages/bot --ignore-scripts
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
