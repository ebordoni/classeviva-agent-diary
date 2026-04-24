## 1.4.1 — 2026-04-24

- Fix regressione: `/compiti` non andava in timeout — ora fa una sola chiamata AI per tutti i giorni mancanti

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
