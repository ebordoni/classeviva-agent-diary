## 1.7.1 — 2026-09-17

- Fix: il riconoscimento dei giudizi testuali ora privilegia il giudizio più specifico. In particolare, "gravemente insufficiente" non viene più classificato come il generico "insufficiente".

## 1.7.0 — 2026-09-15

- Nuova pagina **Avvisi**: mostra le note/avvisi generali dell'agenda (evtCode `AGNT`), riusando l'endpoint `/api/agenda` già esistente (agendav2). Aggiunta voce in sidebar
- Nuovo contatore "Avvisi" in Dashboard (avvisi nei prossimi 30 giorni)
- Fix: il tipo `EventoAgenda` lato UI non corrispondeva alla risposta reale del server (campo `evtText` inesistente, mancavano `notes`, `isFullDay`, `classDesc`, `subjectId`, `homeworkId`) — corretto, insieme al riferimento nella pagina Agenda generica (non ancora collegata al routing)

## 1.6.7 — 2026-09-11

- Fix vero e proprio dell'account attivo mai evidenziato nell'`AccountSwitcher`: `/api/auth/me`, `/api/auth/login` e `/api/accounts/switch/:studentId` restituivano come `ident` l'ID numerico interno di Classeviva (`whoami.id`) invece dello `studentId` di login usato in `accounts.json` — il confronto lato frontend non trovava mai corrispondenza, quindi nessun avatar risultava mai selezionato
- Rimosso il pallino indicatore sotto l'avatar attivo (ridondante: colore pieno + anello bianco bastano)

## 1.6.6 — 2026-09-11

- Fix: nell'`AccountSwitcher` l'indicatore di account attivo (anello + puntino) era troppo sottile per essere notato. L'account non attivo ora è desaturato in scala di grigi (`grayscale`), mentre l'attivo mantiene il colore pieno con anello bianco e un pallino pieno sotto l'avatar: il contrasto colore-vs-grigio rende lo stato selezionato inequivocabile anche a colpo d'occhio

## 1.6.5 — 2026-09-11

- Fix critico: rimosso il flag `secure` sul cookie di sessione, introdotto per hardening in 1.5.2. Su percorsi di accesso in solo HTTP (ingress locale non proxato via HTTPS, accesso diretto alla porta 8099) il browser rifiutava di salvare il cookie, causando login "fantasma" o mancata autenticazione su alcuni dispositivi (tipicamente smartphone) mentre altri (PC) apparivano autenticati
- Fix: il pulsante Logout non funzionava piu se erano configurati account da opzioni addon (`accounts`) — l'auto-login da config riautenticava subito l'utente alla richiesta successiva di `/api/auth/me`. Ora un logout esplicito viene ricordato nella sessione e l'auto-login viene saltato finche' l'utente non effettua un nuovo login manuale

## 1.6.4 — 2026-09-11

- Fix: nell'`AccountSwitcher` l'avatar dell'account attivo non era distinguibile dagli altri (l'anello di evidenziazione non era visibile sulla barra scura). Ora l'account attivo ha un anello bianco ben visibile, dimensione leggermente maggiore e un puntino sotto l'avatar; gli altri account sono semi-trasparenti

## 1.6.3 — 2026-09-11

- Fix: pagina Lezioni, la colonna "Docente" non veniva più mostrata su schermi stretti (mobile); ora è sempre visibile, spostata sotto il nome della materia nella stessa cella

## 1.6.2 — 2026-09-11

- Fix: pagina Lezioni ora ordinata dal giorno più recente al meno recente (prima era in ordine crescente)
- Fix: le lezioni all'interno di un giorno sono ordinate per ora effettiva (`evtHPos`) invece che per ordine di arrivo dall'API
- Le lezioni consecutive identiche (stessa materia, docente e argomento su più ore) restituite duplicate da Classeviva vengono ora accorpate in un'unica riga con il range di ore (es. "1ª-3ª")

## 1.6.1 — 2026-09-11

- Dashboard: rimossi i box "Media voti", "Voti totali" e "Assenze totali" (spostati in pagina Voti)
- Dashboard: nuovi contatori "Compiti da eseguire" (solo scadenze future, non conta i compiti passati), "Bacheca da leggere" e "Assenze da giustificare"
- Pagina Voti: aggiunto riepilogo generale (media e totale voti) in cima alla pagina

## 1.6.0 — 2026-09-11

- Il cambio utente (figlio/account) è stato spostato dalla sidebar a una barra superiore sempre visibile, su tutte le pagine e sia su desktop che su mobile
- Nuovo componente `AccountSwitcher`: avatar circolari con le iniziali di ogni account, colore distintivo per account, click diretto per cambiare utente (nessun menu a tendina da aprire)
- Su mobile non è più necessario aprire la sidebar per cambiare figlio

## 1.5.2 — 2026-09-10

- Validazione post-estrazione: i compiti con date non valide o con scadenza precedente alla lezione vengono scartati
- Supporto a provider AI di riserva (`AI_FALLBACK_PROVIDERS`) in caso di fallimento del provider primario

## 1.5.1 — 2026-09-10

- Migliorata l'estrazione compiti con AI: ogni lezione riporta ora il giorno della settimana già calcolato, riducendo gli errori di calcolo delle scadenze (es. "per venerdì")
- Ridotto il payload inviato al modello AI ai soli campi rilevanti, abbassando token/costi
- In caso di errore del provider AI, la pagina Compiti mostra ora un avviso chiaro invece di un risultato vuoto senza spiegazione

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
