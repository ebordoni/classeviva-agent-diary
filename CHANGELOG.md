# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il versioning segue [Semantic Versioning](https://semver.org/).

---

## [1.1.0] — 2026-04-24

### Aggiunto
- Menu comandi `/` di Telegram popolato con tutti i comandi disponibili (`/lezioni`, `/voti`, `/assenze`, `/agenda`, `/compiti`, `/materie`, `/help`, `/login`, `/logout`)

### Migliorato
- Layout messaggi Telegram completamente rivisto per maggiore leggibilità:
  - Date in formato italiano (`ven 24 aprile`) anziché `YYYY-MM-DD`
  - Separatori visivi tra i blocchi di ogni giornata
  - `/lezioni`: ora della lezione (`1ª`, `2ª`, ...) visibile prima della materia
  - `/compiti`: materia e testo del compito su righe separate anziché inline
  - `/agenda`: raggruppamento per data con separatori
  - `/assenze`: intestazione con contatore totale

---

## [1.0.0] — 2026-04-20

### Aggiunto
- Primo rilascio pubblico
- Supporto Home Assistant addon (HA Supervisor)
- Comandi Telegram: `/login`, `/logout`, `/lezioni`, `/voti`, `/assenze`, `/agenda`, `/compiti`, `/materie`, `/help`
- Estrazione compiti da lezioni tramite AI (OpenAI, Google, Anthropic, Groq, xAI)
- Cache delle risposte API per ridurre le chiamate a Classeviva
- Gestione sessione per utente (multi-utente)
- Cancellazione automatica dei messaggi con credenziali (student ID e password)
