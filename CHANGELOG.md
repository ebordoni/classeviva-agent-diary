# Changelog

Tutte le modifiche rilevanti al progetto sono documentate in questo file.

Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.0.0/),
e il versioning segue [Semantic Versioning](https://semver.org/).

---

## [1.8.3] — 2026-05-28

### Aggiunto

- **Addon `classeviva-bot` v1.7.0 / `classeviva-ui` v1.2.0**: cache condivisa tramite `/share/classeviva_cache.json` — i dati scaricati automaticamente dal digest giornaliero del bot sono ora disponibili direttamente nella UI senza nuove chiamate a Classeviva
- **`FileStore`**: rilevamento modifiche via `mtime` con merge `pendingWrites` per garantire la coerenza dei dati tra i due processi concorrenti

---

## [1.8.2] — 2026-05-28

### Migliorato

- **Addon `classeviva-ui`**: interfaccia responsive per mobile — sidebar collassabile (solo icone) su desktop, overlay slide-in con hamburger button su smartphone

---

## [1.8.1] — 2026-05-27

### Corretto

- **Addon `classeviva-ui`**: campo Student ID spariva durante la digitazione nel form login
- **Addon `classeviva-ui`**: logout non reindirizzava alla pagina di login
- **Addon `classeviva-ui`**: crash `Cannot read properties of undefined (reading 'replace')` con certi account
- **Addon `classeviva-ui`**: switcher utente non cliccabile con un solo account salvato
- **Addon `classeviva-ui`**: "Aggiungi account" non preservava la sessione corrente
- **Addon `classeviva-ui`**: nome utente nella sidebar non si aggiornava dopo lo switch
- **Addon `classeviva-ui`**: cartella `/data/` non creata automaticamente al primo avvio

---

## [1.8.0] — 2026-05-27

### Aggiunto

- **Addon `classeviva-ui`**: gestione multi-utenza — più account Classeviva con switcher nella sidebar, credenziali persistite in `/data/accounts.json`, auto-reconnect al riavvio del server
- **Addon `classeviva-ui`**: box "Compiti degli ultimi 7 giorni" nella Dashboard (estratto da lezioni recenti)
- **Addon `classeviva-ui`**: login con dropdown degli account salvati

### Modificato

- **Addon `classeviva-ui`**: rimosse sezioni Agenda, Materie, Note, Didattica dalla navigazione

---

## [1.7.1] — 2026-05-26

### Corretto

- **Addon `classeviva-ui`**: fix percorso file statici UI nel server Express
- **Addon `classeviva-ui`**: fix build Docker — `tsconfig.tsbuildinfo` rimosso dal repo per evitare errore TS7016
- Aggiunto `.dockerignore` per `classeviva-ui`

---

## [1.7.0] — 2026-05-26

### Aggiunto

- **Addon `classeviva-ui`**: interfaccia web per Home Assistant con accesso a tutte le funzionalità del registro (lezioni, voti, assenze, agenda, materie, compiti AI, note, bacheca, didattica)
- Dashboard con riepilogo voti, prossimi eventi e assenze non giustificate
- Supporto HA Ingress con pannello dedicato (`mdi:school-outline`)
- Cache condivisa separata (`cache_ui.json`) per non interferire con il bot

---

## [1.6.0] — 2026-04-24

### Aggiunto

- **Digest giornaliero automatico**: il bot invia ogni mattina un riepilogo dei compiti del giorno a tutti gli utenti che hanno attivato la funzione
- Nuovo comando `/notifiche`: attiva o disattiva il digest giornaliero per la propria chat
- Configurazione orario digest tramite campo `daily_digest_time` (es. `"07:30"`) nelle opzioni dell'addon HA; campo vuoto = funzione disabilitata
- Le credenziali vengono salvate localmente (volume `/data/` protetto da HA Supervisor) solo con consenso esplicito dell'utente tramite `/notifiche`
- Al `/logout` le credenziali vengono cancellate e l'iscrizione al digest rimossa

---

## [1.5.1] — 2026-04-24

### Corretto

- `allowed_chat_ids` ora è una stringa separata da virgola (es. `6039121257,987654321`) invece di lista di interi, per compatibilità con il validatore di HA Supervisor.

---

## [1.5.0] — 2026-04-24

### Aggiunto

- Whitelist chat ID: impostando `allowed_chat_ids` nella configurazione dell'addon HA, solo gli utenti autorizzati possono usare il bot. Se il campo è vuoto l'accesso è aperto a tutti (comportamento precedente).

### Corretto

- `allowed_chat_ids` ora è un campo testo (stringa separata da virgola) invece di lista di interi, per compatibilità con il validatore di HA Supervisor.

---

## [1.4.1] — 2026-04-24

### Corretto

- **Regressione critica 1.3.0**: `/compiti` con N giorni non in cache eseguiva N chiamate AI sequenziali causando timeout a 90s. Ora viene eseguita una sola chiamata AI per tutti i giorni mancanti; i risultati vengono poi suddivisi per `data_lezione` e cachati per-giorno.

### Aggiunto

- Icona addon Home Assistant (`icon.png`)

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
