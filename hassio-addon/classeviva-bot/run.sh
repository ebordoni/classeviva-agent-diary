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
# Chat ID autorizzati come stringa separata da virgola (es. "123456,789012")
ALLOWED_CHAT_IDS=$(jq -r '.allowed_chat_ids // ""' "$OPTIONS")
# Orario digest giornaliero (es. "07:30", vuoto = disabilitato)
DAILY_DIGEST_TIME=$(jq -r '.daily_digest_time // ""' "$OPTIONS")
WHATSAPP_DIGEST_ENABLED=$(jq -r '.whatsapp_digest_enabled // false' "$OPTIONS")
WHATSAPP_PUBLISHER_URL=$(jq -r '.whatsapp_publisher_url // ""' "$OPTIONS")
WHATSAPP_SHARED_SECRET=$(jq -r '.whatsapp_shared_secret // ""' "$OPTIONS")

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
export DAILY_DIGEST_TIME="$DAILY_DIGEST_TIME"
export WHATSAPP_DIGEST_ENABLED="$WHATSAPP_DIGEST_ENABLED"
export WHATSAPP_PUBLISHER_URL="$WHATSAPP_PUBLISHER_URL"
export WHATSAPP_SHARED_SECRET="$WHATSAPP_SHARED_SECRET"
export CACHE_DB_PATH="/share/classeviva_cache.json"
export NODE_ENV="production"

echo "[classeviva-bot] Avvio (provider AI: ${AI_PROVIDER})"

exec node /app/packages/bot/dist/index.js
