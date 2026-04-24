# @classeviva/core

> Libreria TypeScript per interagire con le API di Classeviva (Registro Elettronico Spaggiari)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)

## ✨ Features

- ✅ **100% TypeScript** con strict mode
- ✅ **Type-safe API wrapper** completo per tutte le API Classeviva
- ✅ **Gestione multi-utente** con `ListaUtenti`
- ✅ **Integrazione AI** per estrazione automatica compiti (OpenAI, Google, Anthropic, Groq)
- ✅ **Gestione errori robusta** con eccezioni custom
- ✅ **Utilities date** per anno scolastico e formattazione
- ✅ **ESM modules** per compatibilità moderna

## 📦 Installazione

```bash
npm install @classeviva/core
```

## 🚀 Quick Start

### Login e recupero lezioni

```typescript
import { ClassevivaClient } from "@classeviva/core";

const client = new ClassevivaClient("S1234567", "password123");

await client.accedi();
console.log(`Benvenuto ${client.nomeCompleto}!`);

const lezioni = await client.lezioni();
console.log(`Oggi hai ${lezioni.lessons.length} lezioni`);
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

// Estrai lezioni ultimi 10 giorni
const { inizio, fine } = ultimiNGiorni(10);
const lezioni = await client.lezioniDaA(inizio, fine);

// Provider supportati: openai | google | anthropic | groq
const ai = new AIService({
  provider: "openai",
  model: "gpt-4o-mini", // opzionale, usa il default del provider
  apiKey: "sk-...",
});

const compiti = await ai.estraiCompiti(lezioni);
console.log(`Trovati ${compiti.metadata.totale_compiti} compiti!`);

for (const compito of compiti.compiti) {
  console.log(`📚 ${compito.materia}`);
  console.log(`   ${compito.testo}`);
  console.log(`   📅 Scadenza: ${compito.scadenza}`);
}
```

## 📚 API Reference

### ClassevivaClient

**Costruttore:**

```typescript
new ClassevivaClient(studentId: string, password?: string, config?: ClassevivaConfig)
```

**Metodi principali:**

#### Autenticazione

- `accedi(password?: string): Promise<void>` - Login
- `connesso: boolean` - Verifica se connesso
- `datiUtente: UserData | undefined` - Dati utente loggato

#### Lezioni

- `lezioni(): Promise<LezioniResponse>` - Lezioni di oggi
- `lezioniGiorno(data: string): Promise<LezioniResponse>` - Lezioni di un giorno
- `lezioniDaA(dataInizio: string, dataFine: string): Promise<LezioniResponse>` - Lezioni in range
- `lezioniDaAMateria(dataInizio, dataFine, materiaId): Promise<LezioniResponse>` - Lezioni per materia

#### Voti e Valutazioni

- `voti(): Promise<VotiResponse>` - Tutti i voti
- `materie(): Promise<MaterieResponse>` - Tutte le materie
- `periodi(): Promise<PeriodiResponse>` - Tutti i periodi

#### Assenze

- `assenze(): Promise<AssenzeResponse>` - Tutte le assenze
- `assenzeDa(dataInizio: string): Promise<AssenzeResponse>` - Assenze da una data
- `assenzeDaA(dataInizio, dataFine): Promise<AssenzeResponse>` - Assenze in range

#### Agenda

- `agenda(): Promise<AgendaResponse>` - Agenda completa
- `agendaDaA(dataInizio, dataFine): Promise<AgendaResponse>` - Agenda in range

#### Note e Comunicazioni

- `note(): Promise<NoteResponse>` - Tutte le note
- `leggiNota(eventCode, evtId): Promise<void>` - Marca nota come letta
- `bacheca(): Promise<BachecaResponse>` - Bacheca comunicazioni
- `bachecaLeggi(eventCode, pubId): Promise<ContenutoItem>` - Leggi elemento bacheca

#### Didattica e Documenti

- `didattica(): Promise<DidatticaResponse>` - Folder didattica
- `didatticaElemento(folderId): Promise<ElementiDidatticaResponse>` - Elementi folder
- `documenti(): Promise<DocumentiResponse>` - Tutti i documenti
- `controllaDocumento(hash): Promise<any>` - Controlla documento

### ListaUtenti

**Costruttore:**

```typescript
new ListaUtenti(utentiConfig?: UtenteConfig[])
```

**Metodi:**

- `aggiungi(studentId, password?): ClassevivaClient` - Aggiungi utente
- `rimuovi(studentId): void` - Rimuovi utente
- `ottieni(studentId): ClassevivaClient` - Ottieni client utente
- `esiste(studentId): boolean` - Verifica esistenza
- `accediTutti(): Promise<void>` - Login tutti gli utenti
- `accediMultipli(studentIds[]): Promise<void>` - Login selettivo
- `lezioniTutti(): Promise<Map<string, any>>` - Lezioni per tutti
- `svuota(): void` - Svuota lista

**Proprietà:**

- `idUtenti: string[]` - Array ID utenti
- `tuttiUtenti: ClassevivaClient[]` - Array tutti i client
- `numeroUtenti: number` - Conteggio utenti

### AIService

**Costruttore:**

```typescript
new AIService(options?: AIServiceOptions)
```

```typescript
interface AIServiceOptions {
  provider?: "openai" | "google" | "anthropic" | "groq"; // default: "openai"
  model?: string; // default dipende dal provider (vedi tabella sotto)
  apiKey?: string; // default: variabile d'ambiente del provider
  temperature?: number; // default: 0.1
}
```

**Modelli default per provider:**

| Provider    | Modello default             | Variabile env       |
| ----------- | --------------------------- | ------------------- |
| `openai`    | `gpt-4o-mini`               | `OPENAI_API_KEY`    |
| `google`    | `gemini-2.0-flash`          | `GOOGLE_API_KEY`    |
| `anthropic` | `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY` |
| `groq`      | `llama-3.1-8b-instant`      | `GROQ_API_KEY`      |

**Metodi:**

- `estraiCompiti(lezioni, modello?): Promise<CompitiEstrattiResponse>` - Estrai compiti con AI

## 🛠️ Utilities

### Date Helpers

```typescript
import {
  anno,
  formattaData,
  dataInizioAnno,
  dataFineAnnoOOggi,
  ultimiNGiorni,
  aggiungiGiorni,
  prossimoGiornoSettimana,
  validaDate,
} from "@classeviva/core";

// Anno scolastico corrente
const annoScolastico = anno(); // es. "2024/2025"

// Formattazione date
const oggi = formattaData(new Date()); // "YYYY-MM-DD"

// Range anno scolastico
const inizio = dataInizioAnno(); // 01/09/YYYY
const fine = dataFineAnnoOOggi(); // oggi o fine anno

// Ultimi N giorni
const { dataInizio, dataFine } = ultimiNGiorni(7);

// Calcolo date
const domani = aggiungiGiorni(new Date(), 1);
const prossimoVenerdi = prossimoGiornoSettimana(new Date(), 5);

// Validazione
validaDate("2024-01-01", "2024-12-31"); // Solleva errore se invalide
```

### Collegamenti (Endpoints)

```typescript
import { Collegamenti } from "@classeviva/core";

// URL formattati
const urlLezioni = Collegamenti.getLessonsUrl("S1234567", "2024-01-15");
const urlVoti = Collegamenti.formatUrl(Collegamenti.GRADES, {
  studentId: "S1234567",
});
```

### Eccezioni

```typescript
import {
  ClassevivaError,
  PasswordNonValida,
  NonAccesso,
  TokenScaduto,
  DataFuoriGamma,
} from "@classeviva/core";

try {
  await client.accedi();
} catch (error) {
  if (error instanceof PasswordNonValida) {
    console.error("Password errata!");
  } else if (error instanceof NonAccesso) {
    console.error("Devi effettuare il login prima");
  }
}
```

## 📘 Types

Tutti i tipi sono esportati e disponibili:

```typescript
import type {
  Lezione,
  LezioniResponse,
  Voto,
  VotiResponse,
  Assenza,
  AssenzeResponse,
  EventoAgenda,
  AgendaResponse,
  Materia,
  MaterieResponse,
  Periodo,
  PeriodiResponse,
  Nota,
  NoteResponse,
  ItemBacheca,
  BachecaResponse,
  FolderDidattica,
  DidatticaResponse,
  Documento,
  DocumentiResponse,
  CompitoEstratto,
  CompitiEstrattiResponse,
  AIServiceOptions,
  AIProvider,
  UserData,
} from "@classeviva/core";
```

## 🔧 Configurazione Avanzata

### Custom Axios Config

```typescript
const client = new ClassevivaClient("S1234567", "password", {
  baseUrl: "https://web.spaggiari.eu/rest/v1",
  timeout: 60000, // 60 secondi
});
```

## 🧪 Sviluppo

```bash
# Clone repository
git clone <repo-url>
cd CLASSEVIVA-DIARIO/packages/core

# Installa dipendenze
npm install

# Build TypeScript
npm run build

# Watch mode (sviluppo)
npm run watch

# Pulisci dist
npm run clean
```

## 📄 Licenza

MIT - Vedi [LICENSE](../../LICENSE) per dettagli.

## 🙏 Riconoscimenti

- Fork originale: [FLAK-ZOSO/Classeviva](https://github.com/FLAK-ZOSO/Classeviva) (Python)
- API Classeviva: Gruppo Spaggiari Parma

## 📞 Supporto

- Issues: [GitHub Issues](../../issues)
- Documentation: [Docs](../../docs)

---

**Made with ❤️ using TypeScript**
