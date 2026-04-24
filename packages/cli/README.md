# @classeviva/cli

> CLI tool per interagire con Classeviva da terminale

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## ✨ Features

- 🔐 **Login interattivo** con salvataggio credenziali
- 📚 **Lezioni** - Visualizza lezioni per data o range
- 📝 **Voti** - Visualizza tutti i voti con media
- 📅 **Assenze** - Visualizza assenze, ritardi, uscite anticipate
- 📌 **Agenda** - Eventi, compiti, verifiche
- 🤖 **Compiti AI** - Estrazione automatica con Ollama
- 📖 **Materie** - Lista materie e docenti
- 🎨 **Output colorato** - Tabelle formattate o JSON
- ⚡ **Performance** - Veloce e leggero

## 📦 Installazione

### Globale (raccomandato)

```bash
npm install -g @classeviva/cli
```

Ora puoi usare `classeviva` o `cv` da qualsiasi directory.

### Locale (sviluppo)

```bash
cd packages/cli
npm install
npm run build
npm link  # Crea link globale
```

## 🚀 Quick Start

### 1. Login

```bash
# Login interattivo
classeviva login

# Login con credenziali
classeviva login -u S1234567 -p password

# Le credenziali vengono salvate in ~/.classeviva/config.json
```

### 2. Visualizza Lezioni

```bash
# Ultimi 7 giorni (default)
classeviva lezioni

# Ultimi 30 giorni
classeviva lezioni -l 30

# Lezioni di un giorno specifico
classeviva lezioni -d 2024-01-15

# Range di date
classeviva lezioni -s 2024-01-01 -e 2024-01-31

# Output JSON
classeviva lezioni -j
```

### 3. Visualizza Voti

```bash
# Tutti i voti con media
classeviva voti

# Output JSON
classeviva voti -j
```

### 4. Visualizza Assenze

```bash
# Tutte le assenze
classeviva assenze

# Da una data
classeviva assenze -s 2024-01-01

# Range
classeviva assenze -s 2024-01-01 -e 2024-12-31
```

### 5. Agenda

```bash
# Agenda completa
classeviva agenda

# Range di date
classeviva agenda -s 2024-01-01 -e 2024-01-31
```

### 6. Estrazione Compiti con AI

```bash
# Estrai compiti dagli ultimi 10 giorni
classeviva compiti

# Ultimi 15 giorni
classeviva compiti -l 15

# Provider e modello specifici
classeviva compiti -P openai -m gpt-4o
classeviva compiti -P google -m gemini-2.0-flash
classeviva compiti -P anthropic
classeviva compiti -P groq
classeviva compiti -P xai

# Con API key inline (oppure usa variabili d'ambiente)
classeviva compiti -k sk-...

# Salva in file JSON
classeviva compiti -o compiti.json

# Range di date
classeviva compiti -s 2024-01-01 -e 2024-01-31
```

**Provider supportati:**

| Provider  | Flag `-P`   | Modello default             | Env key                        |
| --------- | ----------- | --------------------------- | ------------------------------ |
| OpenAI    | `openai`    | `gpt-4o-mini`               | `OPENAI_API_KEY`               |
| Google    | `google`    | `gemini-2.0-flash`          | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Anthropic | `anthropic` | `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY`            |
| Groq      | `groq`      | `llama-3.1-8b-instant`      | `GROQ_API_KEY`                 |
| xAI       | `xai`       | `grok-3-mini`               | `XAI_API_KEY`                  |

### 7. Lista Materie

```bash
# Tutte le materie
classeviva materie

# Output JSON
classeviva materie -j
```

## 📋 Tutti i Comandi

### `classeviva login`

Effettua login e salva credenziali.

**Opzioni:**

- `-u, --user <studentId>` - Student ID
- `-p, --password <password>` - Password
- `--no-save` - Non salvare credenziali
- `--clear` - Cancella credenziali salvate

**Esempi:**

```bash
classeviva login                        # Interattivo
classeviva login -u S1234567 -p pass    # Con credenziali
classeviva login --clear                # Cancella credenziali
```

### `classeviva lezioni`

Recupera le lezioni.

**Opzioni:**

- `-d, --date <data>` - Data specifica (YYYY-MM-DD)
- `-s, --start <data>` - Data inizio
- `-e, --end <data>` - Data fine
- `-l, --last <giorni>` - Ultimi N giorni (default: 7)
- `-m, --materia <id>` - Filtra per materia ID
- `-j, --json` - Output JSON

**Esempi:**

```bash
classeviva lezioni                       # Ultimi 7 giorni
classeviva lezioni -l 30                 # Ultimo mese
classeviva lezioni -d 2024-01-15         # Un giorno
classeviva lezioni -s 2024-01-01 -e 2024-01-31  # Range
```

### `classeviva voti`

Recupera i voti con media.

**Opzioni:**

- `-j, --json` - Output JSON

**Esempi:**

```bash
classeviva voti          # Tabella con media
classeviva voti -j       # Output JSON
```

### `classeviva assenze`

Recupera assenze, ritardi, uscite anticipate.

**Opzioni:**

- `-s, --start <data>` - Data inizio
- `-e, --end <data>` - Data fine
- `-j, --json` - Output JSON

**Esempi:**

```bash
classeviva assenze                          # Tutte
classeviva assenze -s 2024-01-01            # Da una data
classeviva assenze -s 2024-01-01 -e 2024-12-31  # Range
```

### `classeviva agenda`

Recupera eventi agenda (compiti, verifiche, eventi).

**Opzioni:**

- `-s, --start <data>` - Data inizio
- `-e, --end <data>` - Data fine
- `-j, --json` - Output JSON

**Esempi:**

```bash
classeviva agenda                           # Completa
classeviva agenda -s 2024-01-01 -e 2024-01-31  # Range
```

### `classeviva compiti`

Estrae compiti dalle lezioni usando AI.

**Opzioni:**

- `-l, --last <giorni>` - Ultimi N giorni (default: 10)
- `-s, --start <data>` - Data inizio
- `-e, --end <data>` - Data fine
- `-P, --provider <provider>` - Provider AI: `openai`|`google`|`anthropic`|`groq`|`xai`
- `-m, --model <modello>` - Modello AI (sovrascrive il default del provider)
- `-k, --api-key <key>` - API key (sovrascrive la variabile d'ambiente)
- `-o, --output <file>` - Salva in file JSON
- `-j, --json` - Output JSON
- `--debug` - Mostra dettagli request/response in caso di errore

**Esempi:**

```bash
classeviva compiti                              # Ultimi 10 giorni, OpenAI
classeviva compiti -l 15                        # Ultimi 15 giorni
classeviva compiti -P google                    # Google Gemini
classeviva compiti -P groq -m llama-3.3-70b     # Groq con modello specifico
classeviva compiti -P xai -m grok-3-mini         # xAI Grok
classeviva compiti -k sk-... -o compiti.json    # API key inline + salva file
classeviva compiti -s 2024-01-01 -e 2024-01-31 # Range date
```

### `classeviva materie`

Recupera tutte le materie studiate.

**Opzioni:**

- `-j, --json` - Output JSON

**Esempi:**

```bash
classeviva materie       # Tabella
classeviva materie -j    # JSON
```

## ⚙️ Configurazione

### File di Configurazione

Le credenziali vengono salvate in `~/.classeviva/config.json`:

```json
{
  "studentId": "S1234567",
  "password": "tua_password",
  "aiProvider": "openai",
  "aiModel": "gpt-4o-mini",
  "aiApiKey": "sk-..."
}
```

### Variabili d'Ambiente

Le variabili d'ambiente hanno precedenza sul file di configurazione.

**File `.env` (raccomandato):**

```env
CLASSEVIVA_STUDENT_ID=S1234567
CLASSEVIVA_PASSWORD=tuapassword

# Provider AI (una sola necessaria)
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...

# Oppure direttamente la variabile del provider
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
XAI_API_KEY=xai-...
```

**Export in shell:**

```bash
export CLASSEVIVA_STUDENT_ID=S1234567
export CLASSEVIVA_PASSWORD=password
export OPENAI_API_KEY=sk-...
```

> 💡 Il CLI carica automaticamente le variabili dal file `.env` se presente.

### Opzioni da Riga di Comando

Puoi sempre sovrascrivere con opzioni CLI:

```bash
classeviva lezioni -u ALTRO_STUDENT -p altra_pass
```

## 🎨 Output

### Formato Tabella (Default)

```
┌────────────┬────────┬─────────────────┬───────────────────┬─────────────────┐
│ Data       │ Ora    │ Materia         │ Docente           │ Argomento       │
├────────────┼────────┼─────────────────┼───────────────────┼─────────────────┤
│ 2024-01-15 │ Ora 1  │ Matematica      │ Prof. Rossi       │ Derivate...     │
│ 2024-01-15 │ Ora 2  │ Storia          │ Prof. Bianchi     │ Prima guerra... │
└────────────┴────────┴─────────────────┴───────────────────┴─────────────────┘

✓ Totale lezioni: 2
```

### Formato JSON

```bash
classeviva lezioni -j
```

```json
{
  "lessons": [
    {
      "evtId": 123,
      "evtDate": "2024-01-15",
      "evtCode": "LSF0",
      "evtHPos": 1,
      "evtDuration": 60,
      "subjectId": 45,
      "subjectDesc": "Matematica",
      "authorName": "Prof. Rossi",
      "lessonArg": "Studio delle derivate..."
    }
  ]
}
```

## 🤖 Integrazione AI

Il comando `compiti` usa la [Vercel AI SDK](https://sdk.vercel.ai/) per estrarre i compiti dal testo delle lezioni.

Tutti i provider richiedono una API key — o come variabile d'ambiente, o con il flag `-k`.

**Costi indicativi per 30 lezioni:**

- **Groq** (`llama-3.1-8b-instant`) — gratuito fino a certi limiti
- **OpenAI** (`gpt-4o-mini`) — ~$0.001
- **Google** (`gemini-2.0-flash`) — gratuito fino a certi limiti
- **Anthropic** (`claude-3-5-haiku`) — ~$0.001
- **xAI** (`grok-3-mini`) — a pagamento

## 🔧 Sviluppo

```bash
# Clone repository
git clone <repo-url>
cd CLASSEVIVA-DIARIO/packages/cli

# Installa dipendenze
npm install

# Build TypeScript
npm run build

# Sviluppo con watch mode
npm run watch

# Test in dev mode (senza compilare)
npm run dev -- lezioni -l 7

# Link globale per testing
npm link
```

## 📝 Script npm

- `npm run build` - Compila TypeScript
- `npm run watch` - Watch mode
- `npm run clean` - Pulisci dist/
- `npm run dev` - Esegui senza compilare (tsx)
- `npm start` - Esegui compilato

## 🐛 Troubleshooting

### "Cannot find module '@classeviva/core'"

```bash
npm run build -w packages/core
```

### "Password non valida"

```bash
classeviva login --clear
classeviva login
```

### Errore API AI

Verifica che la API key sia impostata nel `.env` o passata con `-k`:

```bash
classeviva compiti -P openai -k sk-...
```

### Debug errori di rete

Aggiungi `--debug` a `login` o `compiti` per vedere i dettagli completi della richiesta e risposta HTTP.

## 📄 Licenza

MIT - Vedi [LICENSE](../../LICENSE) per dettagli.

## 🙏 Credits

- Core library: [@classeviva/core](../core)
- Fork originale: [FLAK-ZOSO/Classeviva](https://github.com/FLAK-ZOSO/Classeviva)

---

**Made with ❤️ using TypeScript + Commander.js**
