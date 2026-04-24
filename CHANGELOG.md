# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il versioning segue [Semantic Versioning](https://semver.org/).

---

## [1.4.1] — 2026-04-24

### Corretto

- **Regressione critica 1.3.0**: `/compiti` con N giorni non in cache eseguiva N chiamate AI sequenziali causando timeout a 90s. Ora viene eseguita una sola chiamata AI per tutti i giorni mancanti; i risultati vengono poi suddivisi per `data_lezione` e cachati per-giorno.

---

## [1.4.0] — 2026-04-24

### Aggiunto

- Il bot ricorda lo Student ID dell'ultimo login per ogni chat: al prossimo `/login` viene proposto automaticamente, basta inserire solo la password
- Lo Student ID salvato viene cancellato al `/logout`

---

## [1.3.0] — 2026-04-24

### Migliorato

- Cache `/compiti` ora lavora per-giorno anziché per range date: le lezioni già analizzate dall'AI non vengono riprocessate nelle richieste successive
- TTL differenziato per i compiti: giorni passati = 30 giorni, oggi = 4 ore
- Il feedback del bot indica se i risultati provengono interamente dalla cache o se è stata coinvolta l'AI

---

## [1.2.0] — 2026-04-24

### Aggiunto

- Comando `/aggiorna` per svuotare la cache dell'utente e forzare dati aggiornati da Classeviva
- Garbage collection automatica delle chiavi scadute nel file cache (ogni 2 ore)

### Corretto

- Invalidazione della cache al logout era rotta per le chiavi con range date (lezioni, compiti): ora vengono correttamente cancellate tutte le chiavi dell'utente tramite prefisso

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
