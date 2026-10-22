# Indagine SPID/CIE — 20 ottobre 2026

## UI 2.1.0: accesso automatico da Home Assistant

Il collegamento avviene direttamente tra la UI e l’estensione Chrome. Non
servono terminale, Node.js, il repository sul PC o codici da copiare.
Il primo collegamento richiede Chrome sul PC e la conferma SPID/CIE dal
telefono. Dopo il collegamento puoi consultare il diario anche da iPhone.
Bot e CLI mantengono il loro flusso attuale.

### Preparazione una tantum

1. Aggiorna **Classeviva UI alla 2.1.1 o successiva** e aprila in Chrome sul PC.
2. Nella schermata di accesso apri **Prima volta? Prepara l’accesso in pochi
   passaggi** e premi **Scarica l’estensione**.
3. Estrai lo ZIP in una cartella stabile sul PC. Apri `chrome://extensions`,
   attiva **Modalità sviluppatore** e scegli **Carica estensione non
   pacchettizzata**; seleziona la cartella estratta. Se avevi l’estensione di
   prova 0.1.0, sostituiscila con questa versione 1.0.1.
4. Torna alla UI Classeviva, apri **ClasseViva — accesso SPID/CIE** dal menu
   Estensioni di Chrome e premi **Abilita su questo Home Assistant**.
5. Controlla che la destinazione mostrata sia il tuo Home Assistant, quindi
   concedi a Chrome i permessi per quel sito e `web.spaggiari.eu`. La UI
   segnala **Estensione collegata**. L’abilitazione resta valida anche dopo
   aver chiuso il browser; una nuova origine o porta richiede una nuova
   abilitazione. Non concedere accesso indiscriminato a tutti i siti.

L’installazione manuale è necessaria finché l’estensione non sarà distribuita
tramite uno store. Non è necessario aprire una porta di rete sull’add-on.
Se la UI era già aperta durante l’installazione, ricaricala prima di abilitare
l’estensione. Per aggiungere un profilo da un diario già aperto usa
**Aggiungi account** nella barra superiore.

### Collegare due figli o account

L’implementazione attuale collega il solo profilo selezionato su Spaggiari. Per
aggiungere il secondo, dal diario premi **Aggiungi account**, avvia l’accesso
SPID/CIE e seleziona l’altro figlio nella pagina Spaggiari. Puoi usare la stessa
identità SPID/CIE se entrambi i profili sono associati ad essa.

Il primo account rimane salvato: dopo il secondo collegamento passa da un
profilo all’altro tramite gli avatar nella barra superiore, senza rifare il
login finché le rispettive sessioni sono valide. Se selezioni nuovamente lo
stesso profilo ne aggiorni il collegamento, senza creare un secondo account.
Per collegare il nuovo profilo usa Chrome sul PC con l’estensione già abilitata;
poi entrambi saranno disponibili anche da iPhone.

### Indagine sul collegamento di tutti i figli con un solo accesso

La [documentazione Spaggiari](https://www.spaggiari.eu/assistenza-generale/come-accedere-allecosistema-spaggiari-tramite-spid)
conferma che l’identità digitale dà accesso ai profili associati alla persona.
Il login separato per ciascun figlio è quindi un limite del flusso attuale
dell’add-on, non un requisito dimostrato della piattaforma.

Per verificare il comportamento reale è disponibile la diagnostica locale
`node scripts/probe-mobile-auth.mjs --profiles`. Conserva in memoria due
sessioni acquisite, verifica letture nel percorso primo–secondo–primo e
controlla separatamente se il token del primo consente di leggere la scheda
del secondo. Gli identificativi provengono esclusivamente da due scambi di
autenticazione riusciti: non vengono provati identificativi arbitrari.
La prova restituisce solo conteggi e indicatori; non modifica gli account HA.

Resta da verificare dal vivo se, dopo una sola conferma CIE, i collegamenti
nella scelta dei figli permettono di ottenere entrambi i token, oppure se le
API espongono una sessione o un elenco comune. I test simulati della
diagnostica non dimostrano quale meccanismo usi l’app ufficiale.

Nella prova del 22 ottobre 2026 il selettore presentava due collegamenti
distinti. Aprendoli in due schede, il primo ha mostrato il form finale mentre
il secondo è tornato al login, sebbene entrambi i JWT di ritorno fossero
ancora validi. Questo non dimostra che il token mobile abbia un ambito limitato
a un solo figlio: lo scambio e il confronto di due sessioni non sono stati
completati. Non viene quindi introdotto il riuso automatico di tali URL.

Dalla UI **2.1.3** la verifica può proseguire sulla sessione già salvata in HA:
**Aggiungi account → Diagnostica del cambio profilo → Verifica profili SPID/CIE**.
La prova legge `/students/{id}/cards` del profilo attivo e tenta la scheda
degli altri identificativi già presenti negli account salvati (massimo cinque).
Non accetta identificativi dal browser e non prova numeri arbitrari. Può
rinnovare normalmente la sessione attiva, ma non collega, rimuove o converte
gli account. L’esito mostra solo stati HTTP, tipi dei campi, conteggi e
corrispondenze; nessun valore personale o token viene restituito alla UI.

### Accesso

La versione 2.1.1 con estensione 1.0.1 corregge l’interruzione sulla scelta
del profilo. Dopo aver sostituito i file ricarica l’estensione da
`chrome://extensions` e ricarica la UI, poi avvia un nuovo login.

1. Premi **Accedi con SPID / CIE** nella UI.
2. Nella scheda Spaggiari seleziona scuola e profilo e completa SPID/CIE.
   Nelle prove precedenti: IC Bovolone, codice VRIC872009.
3. Attendi: il collegamento viene acquisito automaticamente, il diario si
   apre e la scheda finale del login viene chiusa.

Mantieni aperta la UI durante il login. **Annulla collegamento** interrompe
la procedura; se chiudi o ricarichi la UI avvia un nuovo accesso. Il codice
monouso di sessione scade dopo cinque minuti; il PA restituito da Spaggiari
viene scambiato subito perché quello osservato dura un minuto.
L’estensione non legge PIN o password, cookie o cronologia. Legge il campo
mobile solo nella pagina finale della scheda di login che ha aperto, per un
collegamento attivo, e lo invia al documento della UI che lo ha avviato.
Non conserva PA, token di accesso o credenziali di rinnovo: salva soltanto
le origini autorizzate e, nella memoria di sessione del browser, i metadati
necessari alla procedura in corso. Il rinnovo resta sull’add-on.

**Dati disponibili:** lezioni, materie, assenze e Compiti AI. L’estrazione AI
richiede la configurazione del provider. Voti, avvisi e bacheca sono nascosti
per gli account SPID/CIE finché non saranno verificati con dati reali.

Le credenziali sono conservate in `/data/accounts.json` in forma cifrata
AES-256-GCM, con chiave locale `/data/spid-session.key` e permessi riservati.
Entrambi i file devono restare nel volume privato e insieme nei backup: chi
possiede entrambi può recuperare la sessione. La cifratura protegge il file
account isolato, non un’intera istanza Home Assistant compromessa.
Rimuovere un account cancella le sue credenziali locali; **Logout** chiude
soltanto la sessione della UI.

Il rinnovo è automatico al bisogno e salva i token ruotati prima delle nuove
letture. Dopo un riavvio l’add-on ricostruisce il client dalle credenziali
salvate. Un rifiuto definitivo richiede di ricollegare il profilo; un errore
temporaneo conserva la sessione per riprovare. I 30 giorni sono la scadenza
dichiarata dal token osservato, non una durata garantita o provata per intero.
La disponibilità del login iniziale dal solo iPhone non è stata dimostrata.

I vecchi programmi `probe-mobile-auth.mjs` e `link-home-assistant.mjs` restano
strumenti di diagnostica, separati dall’accesso normale. La modalità manuale
è nel riquadro **Diagnostica con programma locale** dell’estensione.

## Flusso degli add-on prima dell’integrazione

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

Per provarla dal browser con l'estensione già installata, eseguire
`npm run build:core` e poi `node scripts/probe-mobile-auth.mjs --core`.
La pagina locale deve indicare **Modalità: core dell’applicativo** e
l'esito `engine: "@classeviva/core"`. La
[guida dell'estensione](../tools/mobile-auth-bridge/README.md) descrive
accesso CIE, trasferimento e prova del rinnovo. Questa modalità usa il
client compilato dalla working copy, senza richiedere token nella console.

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
