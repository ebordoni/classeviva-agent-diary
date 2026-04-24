# Classeviva.js

> Wrapper TypeScript per le API di [Classeviva](https://web.spaggiari.eu/) — Registro Elettronico Spaggiari

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

## 📦 Packages

Progetto monorepo con tre package:

| Package                               | Descrizione                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| [`@classeviva/core`](./packages/core) | Libreria TypeScript — client API, tipi, integrazione AI              |
| [`@classeviva/cli`](./packages/cli)   | CLI da terminale con output tabulare o JSON                          |
| [`@classeviva/tui`](./packages/tui)   | TUI interattiva basata su [Ink](https://github.com/vadimdemedes/ink) |
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

## 🖥️ Quick Start — TUI

Interfaccia interattiva a terminale con menu navigabile.

```bash
# Esecuzione diretta (sviluppo)
cd packages/tui
npm run dev

# Oppure dopo la build
npm run build
classeviva-tui   # oppure: cvtui
```

Supporta le stesse variabili d'ambiente del CLI per pre-popolare le credenziali.

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

Il bot è disponibile come **addon per Home Assistant** nella cartella [`hassio-addon/`](./hassio-addon/).
Aggiungere il repository `https://github.com/ebordoni/classeviva-agent-diary` nell'Add-on Store di HA.

> Consulta [packages/bot/README.md](./packages/bot/README.md) per la documentazione completa.

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

```bash
git clone https://github.com/ebordoni/classeviva-diario.git
cd classeviva-diario
npm install

# Build di tutti i package
npm run build

# Build selettivi
npm run build:core
npm run build:cli
npm run build:tui

# Sviluppo con watch
npm run dev:core

# Usa il CLI in locale senza installarlo globalmente
npm run cv -- lezioni
```

---

## 📄 Struttura del repository

```
packages/
  core/        — Libreria TypeScript (@classeviva/core)
  cli/         — CLI tool (@classeviva/cli)
  tui/         — TUI interattiva (@classeviva/tui)
examples-ts/   — Esempi di utilizzo della libreria
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

### Garanzie

- Il codice è **open source e auditabile** — chiunque può verificare esattamente cosa fa il bot con le credenziali.
- Se ospiti il bot per altri utenti, questi devono fidarsi di te come operatore: non esiste soluzione tecnica che elimini questo requisito di fiducia per un servizio che accetta credenziali.
- **Raccomandazione**: ogni utente dovrebbe installare la propria istanza del bot sul proprio Home Assistant.

## 📄 Licenza

[MIT](./LICENSE)
