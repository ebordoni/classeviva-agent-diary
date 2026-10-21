# ClasseViva — accesso SPID/CIE (estensione 1.0.1)

Collega la UI Home Assistant a Spaggiari senza terminale, programmi locali o
codici da copiare. La UI 2.1.0 include il download dello ZIP dell’estensione.

## Preparazione una tantum

1. Scarica lo ZIP dalla schermata di accesso della UI e scompattalo in una
   cartella stabile, oppure usa questa cartella del repository aggiornato.
2. In Chrome apri `chrome://extensions`, abilita **Modalità sviluppatore** e
   scegli **Carica estensione non pacchettizzata**. Seleziona la cartella.
   Sostituisci la precedente estensione di prova se era installata.
3. Apri la UI Classeviva, poi il popup dell’estensione. Controlla la destinazione
   e premi **Abilita su questo Home Assistant**. Concedi i permessi per il tuo
   Home Assistant e `web.spaggiari.eu`.
4. Nella UI premi **Accedi con SPID / CIE**, completa il login, seleziona il profilo proposto da Spaggiari e attendi il ritorno
   automatico al diario. Per un profilo aggiuntivo usa **Aggiungi account**.

[Procedura completa](https://github.com/ebordoni/classeviva-agent-diary/blob/main/docs/spid-cie.md#ui-210-accesso-automatico-da-home-assistant).
Il primo collegamento avviene dal PC; le conferme restano sul telefono.

## Permessi e riservatezza

- `activeTab` e `scripting`: riconoscimento della UI dopo un comando dell’utente,
  supporto alla cornice Ingress e lettura del solo campo `spid-patoken` nella
  pagina finale HTTPS `web.spaggiari.eu/home/app/default/mspidauth.php`.
- I permessi per i siti sono opzionali: il popup richiede soltanto il sito
  Home Assistant selezionato e Spaggiari. Non registra script su tutti i siti.
- `storage.local`: solo origini Home Assistant autorizzate. `storage.session`:
  metadati temporanei della procedura, eliminati a completamento, annullamento
  o chiusura del browser. Mai PA, token API, credenziali di rinnovo o URL Ingress.
- Il worker legge soltanto la scheda che ha aperto per il login, con scadenza
  e associazione al documento della UI di origine. Una navigazione, un’altra
  scheda o un altro frame non possono ricevere il risultato al suo posto.
- Nessun permesso `cookies`, `history` o `webRequest`; nessuna lettura di PIN
  o password. Il server conserva e rinnova la sessione cifrata.
- Il permesso loopback e il collegamento a `127.0.0.1:18765` sono mantenuti
  esclusivamente per la diagnostica manuale precedente, attivata dal suo pulsante.

Puoi revocare i permessi o rimuovere l’estensione da Chrome. Le sessioni già
collegate alla UI continuano a rinnovarsi sul server; l’estensione serve
soltanto per un nuovo login interattivo.

## Diagnostica precedente

Il riquadro **Diagnostica con programma locale** conserva la prova manuale.
Solo per sviluppatori, dalla root del repository:

```powershell
npm run build:core
node scripts/probe-mobile-auth.mjs --core
```

In alternativa `node scripts/link-home-assistant.mjs` mantiene il vecchio
ponte locale. Non è richiesto dal nuovo pulsante della UI. Chiudi prima un
vecchio programma sulla porta 18765 con `Ctrl+C`.
Non incollare token o URL di autenticazione in chat, file sorgenti o log.

## Copia inclusa nell’add-on

Questa cartella è la fonte; `hassio-addon/classeviva-ui/src/auth-extension`
è la copia verificata da `npm run verify:addon-sources`. La build crea lo ZIP
scaricabile dalla UI senza includere dati dell’istanza.

## Correzione 1.0.1

Spaggiari usa `mspidauth.php` anche per la scelta del profilo, prima di
restituire il token. L’estensione attende la scelta del figlio senza
interrompere il collegamento. Dopo l’aggiornamento dei file premi **Ricarica**
per l’estensione in Chrome e ricarica anche la UI Home Assistant.
