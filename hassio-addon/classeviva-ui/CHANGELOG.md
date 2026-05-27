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
