## 1.8.4 — 2026-05-28

- Refactor: rinominato il pacchetto interno `core2` in `core` — nessuna modifica funzionale

## 1.8.3 — 2026-05-28

- Fix: corretti import `@classeviva/core` nel workflow di sincronizzazione sorgenti (GitHub Actions copiava da `packages/core` invece di `packages/core` sovrascrivendo i fix manuali)

## 1.8.2 — 2026-05-28

- Fix: cache bust Docker per forzare il ricopiamento dei sorgenti corretti nell'immagine

## 1.8.1 — 2026-05-28

- Fix: ripristinati import `@classeviva/core` nei file del bot dell'addon (erano stati erroneamente impostati a `@classeviva/core` causando errore di build)

## 1.8.0 — 2026-05-28

- Migrato da `@classeviva/core` (API v1) a `@classeviva/core` (nuova API `/rest/w1`)
- Autenticazione aggiornata: login via `AuthApi4.php` + cookie `PHPSESSID`
- Aggiornati i riferimenti ai tipi: `WhoAmI.id` (era `.ident`), `Docente.teacherName`, `AgendaItem.notes`
- Aggiunta gestione `decimalValue: null` nel calcolo delle medie dei voti

## 1.7.1 — 2026-05-28

- Fix: `run.sh` ripristinato al contenuto corretto (era stato corrotto con il contenuto dell'addon UI)
- Aggiunto guard esplicito nel Dockerfile sui file `dist/` prodotti da `tsc`

## 1.7.0 — 2026-05-28

- Cache condivisa con l'addon `classeviva-ui`: i dati scaricati automaticamente dal digest giornaliero sono ora disponibili anche nella UI
- `FileStore` aggiornato con rilevamento modifiche via `mtime` per garantire la coerenza tra i due processi che scrivono sullo stesso file
- `CACHE_DB_PATH` spostato da `/data/cache.json` a `/share/classeviva_cache.json`

## 1.6.0 — 2026-04-24

- Digest giornaliero automatico: invia i compiti del giorno ogni mattina
- Nuovo comando `/notifiche` per opt-in/out al digest
- Configurabile tramite `daily_digest_time` nelle opzioni addon (es. `"07:30"`)
- Le credenziali sono salvate solo con consenso esplicito e cancellate al logout

## 1.5.1 — 2026-04-24

- Fix: `allowed_chat_ids` è ora una stringa separata da virgola (es. `6039121257`) invece di lista di interi

## 1.5.0 — 2026-04-24

- Whitelist `allowed_chat_ids`: solo i chat ID configurati possono usare il bot; campo vuoto = accesso aperto
- Fix: `allowed_chat_ids` ora è una stringa separata da virgola (es. `6039121257,987654321`) invece di lista interi, per compatibilità con il validatore HA

## 1.4.1 — 2026-04-24

- Fix regressione: `/compiti` non andava in timeout — ora fa una sola chiamata AI per tutti i giorni mancanti
- Aggiunta icona addon (`icon.png`)

## 1.4.0 — 2026-04-24

- Il bot ricorda lo Student ID: al prossimo `/login` basta inserire solo la password
- Lo Student ID viene dimenticato al `/logout`

## 1.3.0 — 2026-04-24

- Cache `/compiti` per-giorno: l'AI viene chiamata solo per i giorni non ancora analizzati
- TTL 30 giorni per i giorni passati, 4 ore per oggi
- Feedback nel messaggio: indica se i dati sono dalla cache o freschi di AI

## 1.2.0 — 2026-04-24

- Nuovo comando `/aggiorna`: svuota la cache e forza il recupero di dati aggiornati
- Garbage collection automatica delle chiavi scadute (ogni 2 ore)
- Fix: la cache per lezioni e compiti ora viene correttamente invalidata al logout

## 1.1.0 — 2026-04-24

- Menu comandi `/` di Telegram con tutti i comandi disponibili
- Date in formato italiano (`ven 24 aprile`)
- Layout `/compiti`: materia e testo su righe separate
- Layout `/lezioni`: ora della lezione visibile
- Layout `/agenda`: raggruppamento per data
- Layout `/assenze`: intestazione con contatore

## 1.0.0 — 2026-04-20

- Primo rilascio
- Comandi: `/lezioni`, `/voti`, `/assenze`, `/agenda`, `/compiti`, `/materie`
- Estrazione compiti con AI (OpenAI, Google, Anthropic, Groq, xAI)
- Cache delle risposte API
- Cancellazione automatica messaggi con credenziali
