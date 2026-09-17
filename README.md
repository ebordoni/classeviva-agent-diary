# Classeviva.js

> Wrapper TypeScript per le API di [Classeviva](https://web.spaggiari.eu/) — Registro Elettronico Spaggiari

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Client API, CLI, bot Telegram e Web UI per Home Assistant per consultare il
registro elettronico Classeviva. Richiede **Node.js 22 o superiore**.

Per contribuire al progetto, consulta [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📦 Packages

Progetto monorepo con tre package:

| Package                               | Descrizione                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| [`@classeviva/core`](./packages/core) | Libreria TypeScript — client API, tipi, integrazione AI              |
| [`@classeviva/cli`](./packages/cli)   | CLI da terminale con output tabulare o JSON                          |
| [`@classeviva/bot`](./packages/bot)   | Bot Telegram — consulta il registro direttamente da Telegram         |

---

## 🚀 Quick Start — CLI

### Installazione

```bash
npm install -g @classeviva/cli
```

### Utilizzo

```bash
# Login (le credenziali vengono salvate in ~/.classeviva/config.json)
classeviva login

# Oppure abbreviato
cv login

# Comandi principali
classeviva lezioni          # Lezioni degli ultimi 7 giorni
classeviva voti             # Tutti i voti con media per materia
classeviva assenze          # Assenze, ritardi, uscite anticipate
classeviva agenda           # Eventi, compiti, verifiche
classeviva materie          # Lista materie e docenti
classeviva compiti          # Estrazione compiti dalle lezioni tramite AI
```

### Opzioni comuni

```bash
# Intervallo date
classeviva lezioni -l 30                        # Ultimi 30 giorni
classeviva lezioni -d 2024-03-15                # Giorno specifico
classeviva lezioni -s 2024-01-01 -e 2024-01-31  # Range

# Output JSON
classeviva voti -j

# Help
classeviva --help
classeviva lezioni --help
```

### Comando `compiti` (AI)

Estrae automaticamente i compiti dal testo delle lezioni usando AI.

```bash
classeviva compiti                              # Ultimi 10 giorni, per data (default)
classeviva compiti -l 15                        # Ultimi 15 giorni
classeviva compiti -M                           # Raggruppa per materia
classeviva compiti -P google                    # Google Gemini
classeviva compiti -P anthropic                 # Anthropic Claude
classeviva compiti -P groq                      # Groq (gratuito)
classeviva compiti -P xai                       # xAI Grok
classeviva compiti -P groq -m llama-3.3-70b     # Modello specifico
classeviva compiti -k sk-... -o compiti.json    # API key + salva file
```

**Provider supportati:**

| Provider  | Flag `-P`   | Modello default             | Variabile env                  |
| --------- | ----------- | --------------------------- | ------------------------------ |
| OpenAI    | `openai`    | `gpt-4o-mini`               | `OPENAI_API_KEY`               |
| Google    | `google`    | `gemini-2.0-flash`          | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Anthropic | `anthropic` | `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY`            |
| Groq      | `groq`      | `llama-3.1-8b-instant`      | `GROQ_API_KEY`                 |
| xAI       | `xai`       | `grok-3-mini`               | `XAI_API_KEY`                  |

### Configurazione

Le credenziali e le preferenze AI possono essere salvate in `~/.classeviva/config.json` (tramite `classeviva login`) oppure tramite variabili d'ambiente / file `.env`:

```env
CLASSEVIVA_STUDENT_ID=S1234567
CLASSEVIVA_PASSWORD=tuapassword

AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...
```

---

## 🤖 Quick Start — Bot Telegram

Consulta voti, lezioni, compiti e altro direttamente da Telegram, con estrazione compiti tramite AI.

### Comandi disponibili

| Comando             | Descrizione                                |
| ------------------- | ------------------------------------------ |
| `/login`            | Accedi a Classeviva                        |
| `/lezioni [giorni]` | Lezioni degli ultimi N giorni (default: 7) |
| `/voti`             | Voti con media per materia                 |
| `/assenze`          | Assenze, ritardi, uscite anticipate        |
| `/agenda`           | Compiti e verifiche in agenda              |
| `/compiti [giorni]` | Estrai compiti con AI (default: 10 giorni) |
| `/materie`          | Lista materie e docenti                    |
| `/aggiorna`         | Svuota la cache e forza dati aggiornati    |

### Avvio in locale

```bash
# Dalla root del monorepo
npm run dev:bot
```

Variabili d'ambiente necessarie:

```env
TELEGRAM_BOT_TOKEN=123456789:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_PROVIDER=openai        # per /compiti
AI_API_KEY=sk-...
```

### Deploy su Home Assistant

Sono disponibili tre add-on, tutti compatibili con `amd64`, `aarch64` e
`armv7`:

| Add-on | Uso |
| --- | --- |
| **Classeviva Bot** | Interazione via Telegram e digest giornaliero opzionale. |
| **Classeviva UI** | Dashboard web multi-account tramite Ingress Home Assistant o porta `8099`. |
| **Classeviva WhatsApp Bot** | Bot sperimentale, separato dal bot Telegram, per post testuali su Canali WhatsApp. |

1. In Home Assistant apri **Impostazioni → Add-on → Add-on Store**.
2. Dal menu ⋮ scegli **Repository** e aggiungi `https://github.com/ebordoni/classeviva-agent-diary`.
3. Installa l'add-on desiderato, compila la sezione **Configurazione** e avvialo.

Per il **Bot** sono necessari `telegram_token` (creato con
[@BotFather](https://t.me/BotFather)) e, solo per l'estrazione dei compiti,
`ai_api_key`. `allowed_chat_ids` accetta una lista di ID Telegram separata da
virgole e permette di limitare chi usa il bot; `daily_digest_time` usa il
formato `HH:MM` e, se lasciato vuoto, disabilita il digest. Per inoltrare i
compiti trovati dal digest anche al Canale WhatsApp, configura e collega prima
il **WhatsApp Bot**, copia dal suo Ingress l’endpoint interno in
`whatsapp_publisher_url`, imposta lo stesso segreto in
`whatsapp_shared_secret` e abilita `whatsapp_digest_enabled`. La funzione è
disattivata di default.

L’opzione `time_zone` usa un identificativo IANA (predefinito `Europe/Rome`) e
determina sia l’orario del digest sia la data dei compiti analizzati.
`daily_digest_days` (predefinito `31`) determina quante lezioni recenti sono
considerate; il digest invia poi solo i compiti in scadenza da oggi in avanti.

Per la **UI** configura almeno un account oppure accedi dalla schermata di
login. La configurazione può contenere più account:

```yaml
accounts:
  - student_id: S1234567
    password: una-password
ai_provider: openai
ai_model: ""
ai_api_key: ""
session_secret: un-segreto-lungo-e-casuale
```

`session_secret` è raccomandato su installazioni esposte oltre la rete locale.
La UI supporta dashboard, lezioni, voti, assenze, compiti estratti con AI,
avvisi e bacheca; l'add-on è raggiungibile dal pannello laterale tramite
Ingress oppure direttamente sulla porta configurata `8099`.

> Consulta [packages/bot/README.md](./packages/bot/README.md) per i dettagli dei comandi Telegram e delle variabili disponibili.
> Per il Bot WhatsApp sperimentale consulta [la guida dedicata](./hassio-addon/classeviva-whatsapp-publisher/README.md): usa un client WhatsApp non ufficiale e pubblica solo dopo un opt-in esplicito nel Bot Telegram.

### Installazione

```bash
npm install @classeviva/core
```

### Login e lezioni

```typescript
import { ClassevivaClient } from "@classeviva/core";

const client = new ClassevivaClient("S1234567", "password123");
await client.accedi();

console.log(`Benvenuto ${client.nomeCompleto}!`);

const lezioni = await client.lezioni(); // lezioni di oggi
```

### Lezioni in un range di date

```typescript
import { ClassevivaClient, ultimiNGiorni } from "@classeviva/core";

const client = new ClassevivaClient("S1234567", "password123");
await client.accedi();

const { inizio, fine } = ultimiNGiorni(7);
const lezioni = await client.lezioniDaA(inizio, fine);

const voti = await client.voti();
const assenze = await client.assenzeDaA("2024-09-01", "2024-12-31");
const agenda = await client.agendaDaA(inizio, fine);
```

### Gestione multi-utente

```typescript
import { ListaUtenti } from "@classeviva/core";

const lista = new ListaUtenti([
  { studentId: "S1234567", password: "pass1" },
  { studentId: "S9876543", password: "pass2" },
]);

await lista.accediTutti();

const risultati = await lista.lezioniTutti();
for (const [id, lezioni] of risultati) {
  console.log(`${id}: ${lezioni.lessons.length} lezioni`);
}
```

### Estrazione compiti con AI

```typescript
import { ClassevivaClient, AIService, ultimiNGiorni } from "@classeviva/core";

const client = new ClassevivaClient("S1234567", "password123");
await client.accedi();

const { inizio, fine } = ultimiNGiorni(10);
const lezioni = await client.lezioniDaA(inizio, fine);

const ai = new AIService({
  provider: "openai", // openai | google | anthropic | groq | xai
  apiKey: "sk-...",
});

const compiti = await ai.estraiCompiti(lezioni);

for (const compito of compiti.compiti) {
  console.log(
    `📚 ${compito.materia}: ${compito.testo} (entro: ${compito.scadenza})`,
  );
}
```

---

## 📖 API Reference — `ClassevivaClient`

```typescript
new ClassevivaClient(studentId: string, password?: string)
```

### Autenticazione

| Metodo / Proprietà  | Descrizione                 |
| ------------------- | --------------------------- |
| `accedi(password?)` | Login                       |
| `connesso`          | `true` se autenticato       |
| `nomeCompleto`      | Nome e cognome dell'utente  |
| `datiUtente`        | Oggetto `UserData` completo |

### Lezioni

| Metodo                                       | Descrizione                         |
| -------------------------------------------- | ----------------------------------- |
| `lezioni()`                                  | Lezioni di oggi                     |
| `lezioniGiorno(data)`                        | Lezioni di un giorno (`YYYY-MM-DD`) |
| `lezioniDaA(inizio, fine)`                   | Lezioni in range                    |
| `lezioniDaAMateria(inizio, fine, materiaId)` | Filtrate per materia                |

### Voti e Materie

| Metodo      | Descrizione                  |
| ----------- | ---------------------------- |
| `voti()`    | Tutti i voti                 |
| `materie()` | Lista materie                |
| `periodi()` | Periodi dell'anno scolastico |

### Assenze

| Metodo                     | Descrizione         |
| -------------------------- | ------------------- |
| `assenze()`                | Tutte le assenze    |
| `assenzeDa(inizio)`        | Assenze da una data |
| `assenzeDaA(inizio, fine)` | Assenze in range    |

### Agenda

| Metodo                    | Descrizione     |
| ------------------------- | --------------- |
| `agenda()`                | Agenda completa |
| `agendaDaA(inizio, fine)` | Agenda in range |

### Note e Bacheca

| Metodo                           | Descrizione            |
| -------------------------------- | ---------------------- |
| `note()`                         | Tutte le note          |
| `leggiNota(eventCode, evtId)`    | Marca nota come letta  |
| `bacheca()`                      | Bacheca comunicazioni  |
| `bachecaLeggi(eventCode, pubId)` | Leggi elemento bacheca |

### Didattica e Documenti

| Metodo                        | Descrizione                      |
| ----------------------------- | -------------------------------- |
| `didattica()`                 | Folder didattica                 |
| `didatticaElemento(folderId)` | Elementi di un folder            |
| `documenti()`                 | Tutti i documenti                |
| `controllaDocumento(hash)`    | Verifica disponibilità documento |

> Le date sono sempre nel formato `YYYY-MM-DD`.

---

## 🛠️ Sviluppo

### Requisiti

- Node.js **22+** (LTS consigliata)
- npm (incluso con Node.js)
- Docker, solo per costruire localmente le immagini degli add-on

```bash
git clone https://github.com/ebordoni/classeviva-agent-diary.git
cd classeviva-agent-diary
npm ci

# Build di tutti i package
npm run build

# Build selettivi
npm run build:core
npm run build:cli

# Sviluppo con watch
npm run dev:core

# Usa il CLI in locale senza installarlo globalmente
npm run cv -- lezioni
```

`npm ci` usa il lockfile versionato e riproduce le installazioni della CI. Usa
`npm install` solo quando modifichi intenzionalmente le dipendenze e il lockfile.

### Verifica

```bash
# Type-check dei package principali
npm run check

# Test senza credenziali né chiamate esterne
npm test

# Verifica che le copie sorgente degli add-on siano allineate
npm run verify:addon-sources
```

### CI e sincronizzazione degli add-on

Ogni push su `main` e ogni pull request eseguono `npm ci`, il controllo di sincronizzazione, il
type-check, i test e la build Docker dei due add-on. La CI usa Node.js 22.

I sorgenti condivisi non vanno modificati direttamente nelle copie degli
add-on: `packages/core/src/` viene copiato nei due add-on e
`packages/bot/src/` nell'add-on Bot. Il workflow **Sync HA Addon Sources**
esegue questa operazione dopo un push su `main`; se trova differenze crea un
commit di `github-actions[bot]` con messaggio
`chore(addon): sync sources from packages [skip ci]`. Quel commit è previsto e
non indica una modifica esterna inattesa.

Le sorgenti specifiche della Web UI (`hassio-addon/classeviva-ui/src/packages/server`
e `.../ui`) restano invece mantenute nell'add-on. Prima di aprire una pull
request esegui tutti e tre i comandi della sezione **Verifica**.

---

## 📄 Struttura del repository

```
packages/
  core/        — Libreria TypeScript (@classeviva/core)
  cli/         — CLI tool (@classeviva/cli)
  bot/         — Bot Telegram (@classeviva/bot)
hassio-addon/  — Add-on Home Assistant: bot e Web UI
```

---

## 🙏 Crediti

- **Ispirazione**: [FLAK-ZOSO/Classeviva](https://github.com/Lioydiano/Classeviva) (versione Python originale)
- **API**: [Spaggiari / Classeviva](https://web.spaggiari.eu/)
- **Endpoint docs**: [Classeviva-Official-Endpoints](https://github.com/Lioydiano/Classeviva-Official-Endpoints)

## ⚠️ Disclaimer

Progetto non ufficiale, non affiliato con Spaggiari o Classeviva. Usalo a tuo rischio e pericolo.

## 🔒 Privacy e sicurezza

**Il modello corretto è: ogni utente ospita la propria istanza.**

Questo bot è progettato per uso personale su infrastruttura propria (es. Home Assistant). Non è un servizio centralizzato — chi lo installa controlla il server, i dati e le credenziali.

### Cosa fa il bot con le credenziali

| Dato                    | Trattamento                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Password Classeviva** | Usata una sola volta per la chiamata di login all'API. Non viene mai scritta su disco. Il messaggio Telegram contenente la password viene cancellato immediatamente. |
| **Token di sessione**   | Mantenuto solo in RAM. Non viene mai persistito su disco. Va perso al riavvio del bot.                                                                               |
| **Student ID**          | Salvato nel file cache locale (`cache.json`) per evitare di reinserirlo a ogni login. È uno username, non un segreto critico.                                        |
| **Dati del registro**   | Cachati localmente sul tuo server per ridurre le chiamate API. Non vengono mai trasmessi a terzi.                                                                    |

La **Web UI** è diversa dal bot: per rendere disponibile il cambio account,
salva le credenziali configurate o inserite al login nel volume privato
dell'add-on (`/data/accounts.json`). Bot e UI condividono inoltre la cache del
registro in `/share/classeviva_cache.json`. Proteggi l'accesso al tuo Home
Assistant e tratta i backup di questi volumi come dati sensibili.

### Garanzie

- Il codice è **open source e auditabile** — chiunque può verificare esattamente cosa fa il bot con le credenziali.
- Se ospiti il bot per altri utenti, questi devono fidarsi di te come operatore: non esiste soluzione tecnica che elimini questo requisito di fiducia per un servizio che accetta credenziali.
- **Raccomandazione**: ogni utente dovrebbe installare la propria istanza del bot sul proprio Home Assistant.

## 📄 Licenza

[MIT](./LICENSE)
