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
