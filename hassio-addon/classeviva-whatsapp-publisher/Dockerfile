ARG BUILD_FROM
FROM node:22-bookworm-slim AS node
FROM ${BUILD_FROM}

COPY --from=node /usr/local/ /usr/local/

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash jq ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY src/package.json src/package-lock.json ./
RUN npm ci --omit=dev

COPY src/ ./
COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
