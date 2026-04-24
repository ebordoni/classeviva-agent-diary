#!/usr/bin/env bash
set -e

# HA scrive le opzioni dell'add-on in /data/options.json
OPTIONS="/data/options.json"

if [ ! -f "$OPTIONS" ]; then
  echo "[classeviva-bot] ERRORE: $OPTIONS non trovato."
  exit 1
fi

TELEGRAM_TOKEN=$(jq -r '.telegram_token // empty' "$OPTIONS")
AI_PROVIDER=$(jq -r '.ai_provider // "openai"' "$OPTIONS")
AI_MODEL=$(jq -r '.ai_model // empty' "$OPTIONS")
AI_API_KEY=$(jq -r '.ai_api_key // empty' "$OPTIONS")
# Lista di chat ID autorizzati, separati da virgola (es. "123456,789012")
ALLOWED_CHAT_IDS=$(jq -r '[.allowed_chat_ids // [] | .[] | tostring] | join(",")' "$OPTIONS")

if [ -z "$TELEGRAM_TOKEN" ]; then
  echo "[classeviva-bot] ERRORE: telegram_token non impostato!"
  echo "  Vai su Impostazioni → Add-on → Classeviva Bot → Configurazione"
  exit 1
fi

export TELEGRAM_BOT_TOKEN="$TELEGRAM_TOKEN"
export AI_PROVIDER="$AI_PROVIDER"
export AI_MODEL="$AI_MODEL"
export AI_API_KEY="$AI_API_KEY"
export ALLOWED_CHAT_IDS="$ALLOWED_CHAT_IDS"
export CACHE_DB_PATH="/data/cache.json"
export NODE_ENV="production"

echo "[classeviva-bot] Avvio (provider AI: ${AI_PROVIDER})"

exec node /app/packages/bot/dist/index.js
