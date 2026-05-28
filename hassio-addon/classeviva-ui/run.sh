#!/usr/bin/env bash
set -e

OPTIONS="/data/options.json"

if [ ! -f "$OPTIONS" ]; then
    echo "[classeviva-ui] ERRORE: $OPTIONS non trovato."
    exit 1
fi

AI_PROVIDER=$(jq -r '.ai_provider // "openai"' "$OPTIONS")
AI_MODEL=$(jq -r '.ai_model // ""' "$OPTIONS")
AI_API_KEY=$(jq -r '.ai_api_key // ""' "$OPTIONS")
SESSION_SECRET=$(jq -r '.session_secret // ""' "$OPTIONS")
ACCOUNTS_CONFIG=$(jq -c '.accounts // []' "$OPTIONS")

export AI_PROVIDER="$AI_PROVIDER"
export AI_MODEL="$AI_MODEL"
export AI_API_KEY="$AI_API_KEY"
export SESSION_SECRET="$SESSION_SECRET"
export ACCOUNTS_CONFIG="$ACCOUNTS_CONFIG"
export CACHE_DB_PATH="/share/classeviva_cache.json"
export ACCOUNTS_PATH="/data/accounts.json"
export PORT="8099"
export NODE_ENV="production"

echo "[classeviva-ui] Avvio (provider AI: ${AI_PROVIDER}, porta: ${PORT})"

exec node /app/packages/server/dist/index.js
