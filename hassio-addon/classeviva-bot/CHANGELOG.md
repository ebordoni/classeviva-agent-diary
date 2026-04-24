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
