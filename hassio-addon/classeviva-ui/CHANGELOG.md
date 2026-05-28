## 1.5.0 — 2026-05-28

- Nuova funzionalità: account configurabili direttamente dalle opzioni dell'addon in Home Assistant
  - Aggiunto campo `accounts` (lista `student_id`/`password`) nel pannello Opzioni dell'addon
  - Al boot del server gli account vengono sincronizzati da `options.json` e marcati come `fromConfig`
  - Auto-login automatico: se esistono account da config, la sessione viene autenticata senza schermata di login
  - La schermata di login rimane visibile solo se nessun account è configurato o le credenziali non sono valide

## 1.4.0 — 2026-05-28

- Media voti in Dashboard: calcolata su tutti i voti (numerici + testuali), mostrata come giudizio testuale (es. "Ottimo")
- Voti in Dashboard: badge colorato per i voti testuali, valore numerico per i voti numerici
- Compiti in Dashboard: usa i compiti già estratti dall'AI e salvati in cache invece delle lezioni grezze
- Pagina Compiti: mostra subito i compiti in cache al caricamento, senza dover avviare una nuova analisi AI
- Nuova route `GET /api/compiti?giorni=N`: legge i compiti già in cache senza chiamare l'AI
- Estratta logica voti testuali nel modulo condiviso `gradeUtils.ts` (usato da Dashboard e Voti)
- Fix: badge voto duplicato rimosso dalla lista skill in pagina Voti

## 1.3.0 — 2026-05-28

- Pagina **Voti** completamente riscritta per supportare le valutazioni testuali delle scuole primarie
  - Rilevamento automatico: se `decimalValue` è `null` e sono presenti `skills[]`, la vista passa alla modalità testuale
  - I giudizi (`OTTIMO`, `DISTINTO`, `BUONO`, `DISCRETO`, `SUFFICIENTE`, ecc.) vengono estratti dal campo `skillValueNote` con badge colorati
  - Media testuale calcolata tramite ranking dei giudizi
  - Vista espansa per ogni verifica: argomento e dettaglio per skill
- Migrato core interno da API v1 a nuova API `/rest/w1` (`core`)
- Fix: `WhoAmI.id` (era `.ident`) nei file di cache e autenticazione del server

## 1.2.2 — 2026-05-28

- Aggiornato font dell'interfaccia a **Geist Variable** (Vercel) — più moderno e leggibile

## 1.2.1 — 2026-05-28

- Fix: aggiunto guard esplicito nel Dockerfile sui file `dist/` prodotti da `tsc` per evitare immagini rotte in caso di errore silenzioso del build

## 1.2.0 — 2026-05-28

- Cache condivisa con l'addon `classeviva-bot`: i dati già scaricati dal bot (compiti, voti, lezioni) sono disponibili subito nella UI senza ulteriori chiamate a Classeviva
- `FileStore` aggiornato con rilevamento modifiche via `mtime` per garantire la coerenza tra i due processi che scrivono sullo stesso file
- `CACHE_DB_PATH` spostato da `/data/cache_ui.json` a `/share/classeviva_cache.json`

## 1.1.2 — 2026-05-28

- UI responsive: sidebar collassabile (solo icone) su desktop, overlay slide-in su mobile
- Aggiunto top bar con hamburger button su schermi piccoli
- Chiusura automatica della sidebar alla navigazione su mobile
- Backdrop semitrasparente sul menu aperto da mobile

## 1.1.1 — 2026-05-27

- Fix: campo Student ID spariva durante la digitazione (stato `isNewAccount` separato)
- Fix: logout non reindirizzava al login (try/finally + skip spinner su `/login`)
- Fix: crash `data.ident.replace` con account senza campo `ident` nella risposta API
- Fix: switcher utente non visibile con un solo account salvato
- Fix: aggiunta account non preservava la sessione corrente (`forceNew` prop)
- Fix: nome utente nella sidebar non si aggiornava subito dopo lo switch (refetchQueries)
- Fix: cartella `data/` non creata automaticamente alla prima scrittura di `accounts.json`

## 1.1.0 — 2026-05-27

- Multi-utenza: supporto a più account Classeviva con switcher nella sidebar
- Account salvati in `/data/accounts.json` con auto-reconnect al riavvio
- Dashboard: box "Compiti degli ultimi 7 giorni" (da lezioni recenti)
- Rimosse sezioni Agenda, Materie, Note, Didattica dalla navigazione
- Login: dropdown degli account salvati con opzione "+ Nuovo account"

## 1.0.1 — 2026-05-26

- Fix: percorso file statici UI corretto (`../../ui/dist`)
- Fix: errore Docker TS7016 causato da `tsconfig.tsbuildinfo` committato con path Windows
- Aggiunto `.dockerignore` per escludere `dist/` e `node_modules/` dal build context

## 1.0.0 — 2026-05-26

- Primo rilascio dell'addon Classeviva UI
- Interfaccia web per il registro Classeviva accessibile da Home Assistant Ingress
- Dashboard con riepilogo voti, assenze e prossimi eventi
- Schermate: Lezioni, Voti, Assenze, Agenda, Materie, Compiti AI, Note, Bacheca, Didattica
- Estrazione compiti con AI (OpenAI, Google, Anthropic, Groq, xAI)
- Cache persistente su disco con TTL differenziati per tipo di dato
- Login con ricordo dello student ID
