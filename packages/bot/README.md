# @classeviva/bot

> Telegram bot per Classeviva — consulta il registro elettronico direttamente da Telegram.

## Comandi

| Comando             | Descrizione                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `/login`            | Accedi a Classeviva (flusso guidato step-by-step)                 |
| `/logout`           | Disconnetti e invalida la cache                                   |
| `/lezioni [giorni]` | Lezioni degli ultimi N giorni (default: 7)                        |
| `/voti`             | Tutti i voti con media per materia                                |
| `/assenze`          | Assenze, ritardi, uscite anticipate                               |
| `/agenda`           | Compiti e verifiche in agenda                                     |
| `/materie`          | Lista materie e docenti                                           |
| `/compiti [giorni]` | Estrai compiti con AI (default: 10 giorni, richiede `AI_API_KEY`) |
| `/help`             | Mostra i comandi disponibili                                      |

I dati vengono cachati su SQLite per ridurre le chiamate all'API di Classeviva e all'AI (TTL: lezioni/agenda 6h, voti/assenze/compiti 12h, materie 24h). Quando una risposta arriva dalla cache viene indicato con 📦.

---

## Avvio in locale

### 1. Crea il bot su Telegram

1. Apri [@BotFather](https://t.me/BotFather) su Telegram
2. Scrivi `/newbot` e segui le istruzioni
3. Copia il token fornito

### 2. Configura le variabili d'ambiente

```bash
cd packages/bot
cp .env.example .env
```

Modifica `.env`:

```env
TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Provider AI per /compiti (opzionale)
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...

# Percorso cache SQLite (default: ./cache.db)
CACHE_DB_PATH=./cache.db
```

### 3. Avvia

```bash
# Dalla root del monorepo
npm run dev:bot

# Oppure
cd packages/bot
npm run dev
```

---

## Variabili d'ambiente

| Variabile            |    Obbligatoria     | Descrizione                                               |
| -------------------- | :-----------------: | --------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN` |         ✅          | Token del bot da @BotFather                               |
| `AI_API_KEY`         | Solo per `/compiti` | API key del provider AI                                   |
| `AI_PROVIDER`        |         No          | Provider AI (default: `openai`)                           |
| `AI_MODEL`           |         No          | Modello AI (default del provider se omesso)               |
| `CACHE_DB_PATH`      |         No          | Percorso file JSON per la cache (default: `./cache.json`) |
