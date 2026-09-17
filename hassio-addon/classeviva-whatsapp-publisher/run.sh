#!/usr/bin/env bash
set -e

OPTIONS="/data/options.json"

if [ ! -f "$OPTIONS" ]; then
    echo "[classeviva-whatsapp-publisher] ERRORE: $OPTIONS non trovato."
    exit 1
fi

export PUBLISHER_ENABLED="$(jq -r '.enabled // false' "$OPTIONS")"
export PUBLISHER_CHANNEL_JID="$(jq -r '.channel_jid // ""' "$OPTIONS")"
export PUBLISHER_SHARED_SECRET="$(jq -r '.shared_secret // ""' "$OPTIONS")"
export PUBLISHER_MAX_POSTS_PER_DAY="$(jq -r '.max_posts_per_day // 10' "$OPTIONS")"
export PUBLISHER_MIN_INTERVAL_MINUTES="$(jq -r '.min_interval_minutes // 5' "$OPTIONS")"
export PUBLISHER_MAX_ATTEMPTS="$(jq -r '.max_attempts // 3' "$OPTIONS")"
export PUBLISHER_AUTH_DIR="/data/whatsapp-auth"
export PUBLISHER_DB_PATH="/data/publisher.sqlite"
export PORT="8080"
export NODE_ENV="production"

echo "[classeviva-whatsapp-publisher] Avvio (pubblicazione automatica: ${PUBLISHER_ENABLED})"

exec node /app/app/index.mjs
