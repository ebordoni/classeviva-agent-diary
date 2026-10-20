# Prova del callback mobile nel browser

Estensione Chrome Manifest V3 sperimentale, mantenuta insieme alla diagnostica
`scripts/probe-mobile-auth.mjs`. Non è ancora un login integrato negli add-on.

## Permessi e comportamento

- `activeTab` e `scripting`: lettura una tantum, su pressione del pulsante,
  del solo campo `spid-patoken` nella pagina HTTPS
  `web.spaggiari.eu/home/app/default/mspidauth.php` con form `mspidauth-ok`.
- Accesso di rete al loopback `127.0.0.1`. Chrome non distingue le porte nei
  permessi host; codice e Content Security Policy limitano la destinazione
  a `http://127.0.0.1:18765/bridge/probe`.
- Nessun permesso `cookies`, `storage`, `history` o `webRequest`; nessuno script
  permanente sulle pagine, nessun accesso a PIN o password CIE.
- Il token è trasmesso al test locale solo dopo un comando esplicito e con
  un codice di collegamento monouso valido cinque minuti. L'estensione non
  conserva codice e token dopo la chiusura del popup. Il ricevitore conserva
  la sessione soltanto nella memoria del processo e chiama le API Spaggiari.

## Installazione manuale e prova

L'installazione abilita temporaneamente la lettura del token della pagina
attiva quando invochi l'estensione. Procedi solo dopo aver verificato questi
permessi e il codice della cartella.

1. Avvia `node scripts/probe-mobile-auth.mjs` dalla root del repository.
2. In Chrome apri `chrome://extensions`, attiva **Modalità sviluppatore**,
   scegli **Carica estensione non pacchettizzata** e seleziona questa cartella.
3. Apri `http://127.0.0.1:18765`, copia il codice nella sezione **Collegamento
   dalla pagina aperta**. Ricaricare la pagina genera un nuovo codice.
4. Sulla scheda finale del login mobile con “loading… please wait”, premi
   l'icona dell'estensione, incolla il codice e premi **Invia token al test locale**.
5. Il ricevitore avvia subito lo scambio API: il token iniziale osservato dura
   appena un minuto. Mostra solo le date del token, se è un JWT, e l'esito senza
   credenziali. Il pulsante **Ripeti scambio diagnostico** permette di riprovare dopo una correzione del protocollo
   locale senza esportare nuovamente il token. Se è disponibile, **Prova rinnovo**
   verifica separatamente il rinnovo.

Se la pagina finale è ancora aperta, è possibile tentare la prova da quella
pagina senza rigenerare il collegamento di ritorno. La validità del token
contenuto nella pagina resta da verificare. Non incollare token o URL di
autenticazione in chat e non aggiungerli ai file del repository.

Al termine puoi rimuovere l'estensione da `chrome://extensions`; arresta il
processo locale con `Ctrl+C` per eliminare la sessione in memoria.
