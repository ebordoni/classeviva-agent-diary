ARG BUILD_FROM
FROM ${BUILD_FROM}

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash jq curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY src/ .

RUN npm install --workspaces --ignore-scripts
RUN find . -name "*.tsbuildinfo" -delete
RUN npm run build:core
RUN npm run build:server
RUN npm run build:ui
RUN npm prune --omit=dev

RUN mkdir -p /app && \
    cp -r node_modules /app/ && \
    cp package.json /app/ && \
    mkdir -p /app/packages/core && \
    cp -r packages/core/dist /app/packages/core/dist && \
    cp packages/core/package.json /app/packages/core/ && \
    mkdir -p /app/packages/server && \
    cp -r packages/server/dist /app/packages/server/dist && \
    cp packages/server/package.json /app/packages/server/ && \
    mkdir -p /app/packages/ui && \
    cp -r packages/ui/dist /app/packages/ui/dist && \
    cp packages/ui/package.json /app/packages/ui/

COPY run.sh /run.sh
RUN chmod +x /run.sh

WORKDIR /app
CMD ["/run.sh"]
