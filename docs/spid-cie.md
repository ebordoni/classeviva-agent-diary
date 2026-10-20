# Indagine SPID/CIE — 20 ottobre 2026

## Flusso attuale degli add-on

Gli add-on usano ancora il percorso con nome utente e password di
`packages/core/src/client/ClassevivaClient.ts`, tramite
`AuthApi4.php?a=aLoginPwd`. Questo conserva un cookie `PHPSESSID` e
legge `/rest/w1/misc/whoami` e gli endpoint `/rest/w1/students/...`.
La durata locale di 5.400 secondi è una scelta del client, non una scadenza
del server accertata nell'indagine.

Il client è condiviso da CLI, bot Telegram e UI Home Assistant. La UI e i
digest dipendono dalla riconnessione con password; il publisher WhatsApp
riceve i dati dal digest Telegram. Le copie di core e bot negli add-on vanno
mantenute sincronizzate secondo `CONTRIBUTING.md`.

## Risultati osservati

Prova effettuata con login CIE interattivo dell'utente nel browser sul PC e
conferme CieID sul suo iPhone. Nessun PIN, token o cookie è riportato qui.
L'app iOS non è stata ispezionata; il riferimento statico del protocollo è
il codice dell'app Android 5.12.9, poi verificato contro le API reali.

| Verifica | Esito |
| --- | --- |
| Trasferimento dalla pagina finale all'istanza locale | Riuscito tramite estensione, su comando dell'utente |
| Scambio iniziale `/rest/v1/auth/spidlogin` | HTTP 200, token di accesso e credenziale di rinnovo ricevuti |
| `/rest/v1/auth/status` | HTTP 200 |
| Lettura `/rest/v1/students/{id}/lessons/today` | HTTP 200, lezioni leggibili |
| Lezioni per intervallo, materie, periodi e scheda profilo mobile | HTTP 200; campi delle lezioni compatibili con il modello attuale |
| Agenda mobile e voti `grades2324` | HTTP 200 con elenchi vuoti; contenuto non ancora confrontato |
| Dettaglio assenze mobile | HTTP 200 con elementi leggibili |
| Rinnovo `/rest/v1/auth/spidrf` dopo la scadenza del PA iniziale | HTTP 200, seguito da nuove letture riuscite |
| `/rest/w1/misc/whoami` con il token mobile | HTTP 401 |
| `/rest/v1/auth/ticket` con la sessione mobile | HTTP 200 |
| Apertura `repx/app/default/restbridge.php` con ticket | HTTP 403; nessuna sessione PHP ottenuta |

Il PA iniziale osservato dura **60 secondi**. La credenziale di rinnovo
ricevuta dichiara una scadenza **30 giorni** dopo l'emissione. È stato
verificato un rinnovo dopo la scadenza del PA, non un funzionamento reale
per 30 giorni né la sopravvivenza ai riavvii. Questa prova conserva tutto
soltanto nella RAM del processo locale.

La prima prova di rinnovo, che inviava anche `Z-Auth-Token`, ha ricevuto
HTTP 422 con segnalazione di scadenza. La stessa coppia PA/RF ha funzionato
omettendo quel vecchio header: il fallimento non dimostrava la scadenza
della credenziale di rinnovo.

## Protocollo verificato

1. L'utente apre il login ufficiale
   `https://web.spaggiari.eu/home/app/default/login_spid.php?mob=on`, seleziona
   la scuola e completa SPID/CIE.
2. La pagina finale `mspidauth.php` contiene il form `mspidauth-ok` e il campo
   `spid-patoken`. L'estensione lo trasferisce al ricevitore locale; lo scambio
   parte immediatamente, prima della scadenza del PA.
3. `POST /rest/v1/auth/spidlogin` usa JSON con campi `pa` e `rf`, inizialmente
   `rf: null`. Il token di accesso è nel campo `token`; la credenziale di
   rinnovo è restituita nell'header **di risposta** `Z-Spid-Rauth`.
4. Le letture mobile usano `Z-Auth-Token`.
5. `POST /rest/v1/auth/spidrf` usa JSON con il PA originale e la credenziale
   RF. Non invia il vecchio `Z-Auth-Token` né cookie web. Il nuovo token
   sostituisce quello usato dalle letture successive.

Il link di ritorno contiene una credenziale distinta, anch'essa breve:
salvare la pagina come HTML o richiedere di nuovo il link dal backend si è
rivelato inaffidabile. Non è il percorso da integrare nell'interfaccia finale.

## Impatto sull'integrazione

La fattibilità di autenticazione e rinnovo tramite il percorso mobile è
confermata. Non basta sostituire il metodo di login nel client attuale:
il token mobile non autentica direttamente gli endpoint `w1`.

Prima di modificare gli add-on occorre scegliere e verificare il trasporto
dei dati. Il percorso già funzionante è `/rest/v1`: va controllata la
copertura di lezioni per intervallo, materie, agenda e altri dati utilizzati
dai consumatori, adattando i modelli dove differiscono. In alternativa,
l'app ufficiale usa ticket e `restbridge.php` per le WebView, ma la nostra
prova non ha ancora prodotto una sessione web utilizzabile.

La verifica successiva ha confermato lezioni per intervallo, materie,
periodi, scheda profilo e dettaglio assenze tramite API mobile. Lo schema
delle lezioni contiene tutti i campi del modello `Lezione` attuale. Questo
permette di mantenere l'estrazione AI dei compiti dalle lezioni e
l'associazione dei docenti, senza dipendere da `homeworks/index` del portale.
Agenda e voti hanno risposto con elenchi vuoti: il relativo adattamento va
verificato con dati rappresentativi, senza considerare il solo HTTP 200
una prova completa del contratto.

Il primo rilascio può concentrarsi sul diario: autenticazione mobile nel
core, lettura lezioni e materie, collegamento dell'account dalla UI e
rinnovo automatico. Il flusso iniziale richiede ancora il browser sul PC
con estensione o programma di collegamento; l'accesso dal solo iPhone non
è stato dimostrato. Non è stato individuato un callback SPID/CIE che torni
direttamente alla nostra UI Home Assistant. Il collegamento PC/server va
quindi progettato con destinazione esplicita, codice monouso e trasporto
autenticato, senza pubblicare un ricevitore di token aperto su Internet.

L'implementazione dovrà poi introdurre una sessione SPID/CIE nel core,
rinnovo con una sola richiesta concorrente, selezione del profilo e una
richiesta esplicita di nuovo login quando il rinnovo viene rifiutato.
La UI dovrà offrire il collegamento SPID/CIE, senza chiedere PIN o password
CIE. CLI e bot potranno riusare la sessione collegata al server.

Il mantenimento dell'accesso dopo un riavvio richiede inoltre una scelta
esplicita di conservazione delle credenziali nel volume privato dell'istanza,
escluso da log ed esportazioni. La diagnostica attuale non le salva e non
modifica il login degli add-on.

## Verifica locale

`node --test test/mobile-auth-probe.test.mjs test/mobile-auth-bridge.test.mjs`
verifica isolamento locale, consenso tramite codice monouso, scadenza,
formato delle richieste, rinnovo senza vecchio header, riservatezza degli
esiti e blocco dei redirect del collegamento web verso altre origini.
Questi test usano risposte simulate; i risultati della tabella sopra
derivano separatamente dalle prove reali.

## Fase 1: API del core

Implementata in `@classeviva/core` **0.3.0**. Non aggiunge ancora il pulsante
di collegamento alla UI, la conservazione su disco o la riconnessione del bot.

```ts
import { ClassevivaClient } from "@classeviva/core";

// Il PA arriva dal collegamento con il browser, mai da un file sorgente o log.
const client = await ClassevivaClient.accediConSpid(paTokenDaCollegamento);
const lezioni = await client.lezioniDaA("2026-10-01", "2026-10-20");
const materie = await client.materie();

// Solo il chiamante decide dove e come proteggere queste credenziali.
const sessione = client.esportaSessioneSpid();
if (sessione) {
  const ripristinato = await ClassevivaClient.daSessioneSpid(sessione);
  await ripristinato.lezioniGiorno("2026-10-20");
}
```

Le factory verificano il profilo con la scheda restituita dal server. La
sessione ha `version: 1`, identificativo del profilo, PA originale, token
di accesso, token di rinnovo e `expiresAt` in millisecondi Unix. Le scadenze
di accesso vengono lette dal server; se manca una timezone esplicita si usa
il tempo residuo di `/auth/status`, evitando il fuso orario del computer.

Le letture rinnovano prima della scadenza, condividendo un solo rinnovo
concorrente. Un HTTP 401 provoca al massimo un rinnovo e una ripetizione
della lettura. Un rifiuto del rinnovo richiede un nuovo accesso tramite
`AccessoSpidRichiesto`; un errore di rete o del server lascia la sessione
disponibile per un nuovo tentativo. `connesso` indica che l'accesso è ancora
valido oppure rinnovabile, senza effettuare richieste di rete. `accedi()` su
un client mobile forza un rinnovo, senza usare password.

Sono disponibili `card`, `periodi`, `materie`, `assenze` e i metodi di lettura
delle lezioni, inclusi i filtri per giorno e materia e l'intero anno. Il
modello delle lezioni resta quello usato dall'estrazione AI dei compiti.
Agenda, voti, funzioni web, libretto, compiti dell'endpoint web, note,
bacheca e didattica generano `FunzionalitaNonDisponibile`: non ripiegano
sugli endpoint web né effettuano scritture non verificate.

`datiUtente` ora ha tipo `IdentitaUtente`: ID, nome, cognome e tipo account
sono obbligatori, gli altri campi del vecchio `WhoAmI` sono opzionali.
I dati web non disponibili, come la classe, non vengono inventati.
La configurazione `baseUrl` continua a riguardare il client web; il
trasporto SPID/CIE contatta soltanto le API ufficiali HTTPS, senza seguire
redirect. I token restano in campi privati a runtime, e gli errori mobile
non includono configurazione Axios, risposte grezze o credenziali.

La prova reale del nuovo core ha verificato ripristino, corrispondenza del
profilo, lettura di lezioni/materie/periodi/assenze, rinnovo con sostituzione
del token di accesso e ulteriore lettura riuscita. I test in
`test/core-spid.test.mjs` verificano anche concorrenza, revoca, errori
transitori, mancato cambio di profilo e regressione del login web.

Verifica della fase 1 completata: `npm run check`, `npm test` (58 test),
`npm run verify:addon-sources`, controllo del diff e build Docker amd64
di `classeviva-ui` e `classeviva-bot`. Le immagini sono state costruite
localmente; non sono state distribuite su Home Assistant.
