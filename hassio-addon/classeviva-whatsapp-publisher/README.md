# Classeviva WhatsApp Bot

> **Sperimentale.** Add-on Home Assistant che riceve messaggi testuali firmati, li accoda e prova a pubblicarli su un Canale WhatsApp tramite Baileys.

Questo add-on è separato dal bot Telegram: un errore, una disconnessione o un aggiornamento di WhatsApp non impedisce al bot di consultare Classeviva. Non pubblica immagini, video o documenti e non è ancora collegato automaticamente al bot Telegram.

## Avvertenze

- Baileys non è un client ufficiale WhatsApp. I suoi protocolli e il supporto ai Canali possono cambiare senza preavviso.
- Usa un **numero dedicato**, non il tuo numero principale.
- WhatsApp vieta automessaging e usi automatizzati non autorizzati; il numero può essere sospeso. Consulta i [Termini di servizio](https://www.whatsapp.com/legal/terms-of-service?lang=it).
- La sessione WhatsApp in `/data/whatsapp-auth` equivale a una credenziale: non copiarla, non pubblicarla e proteggi i backup Home Assistant.

## Installazione e configurazione

1. Aggiungi questo repository allo Store add-on di Home Assistant e installa **Classeviva WhatsApp Bot**.
2. Lascia `enabled: false` finché non hai completato il pairing e il test del Canale.
3. Imposta un segreto casuale di almeno 32 caratteri in `shared_secret`.
4. Inserisci il link pubblico del Canale in `channel_url`, nel formato `https://whatsapp.com/channel/...`. È il metodo consigliato: il bot ricava il JID automaticamente dopo il pairing. In alternativa puoi usare `channel_jid` con un valore come `123456789012345@newsletter`; configura solo uno dei due campi.
5. Imposta limiti prudenti, ad esempio 10 post/giorno e 5 minuti tra due invii.
6. Abilita l'add-on, avvialo e apri il pannello **WhatsApp Bot**: il QR viene mostrato soltanto lì, tramite Ingress autenticato Home Assistant.
7. Sul numero dedicato apri WhatsApp, vai in **Dispositivi collegati** e scansiona il QR.

L'add-on memorizza coda e sessione solo nel proprio volume `/data`; un riavvio non richiede un nuovo pairing, salvo disconnessione o logout dal telefono.

### Ricavare e verificare il JID

Nel pannello Ingress **WhatsApp Bot**, dopo il pairing, incolla il link del Canale nella sezione **Verifica link Canale**. Il bot mostra il JID risolto senza salvare o modificare le opzioni. Se hai impostato `channel_url`, la stessa risoluzione viene eseguita automaticamente a ogni connessione e il JID attivo è visibile nel pannello.

### Collegamento al Bot Telegram

Il pannello Ingress mostra anche l’**endpoint interno per il Bot Telegram**. Copialo nella voce `whatsapp_publisher_url` del **Classeviva Bot**. Nei due add-on imposta lo stesso valore casuale (almeno 32 caratteri) rispettivamente in `shared_secret` e `whatsapp_shared_secret`; quindi abilita `whatsapp_digest_enabled` nel Bot Telegram.

L’indirizzo resta sulla rete interna di Home Assistant: non esporlo a Internet e non sostituirlo con l’URL Ingress. Il collegamento pubblica soltanto i compiti effettivamente trovati dal digest giornaliero; Telegram continua a ricevere il proprio digest anche se WhatsApp non è disponibile.

## API interna

L'endpoint `POST /api/jobs` è pensato per una futura integrazione del bot. Non esporlo a Internet. Accetta un corpo JSON di massimo 4 KiB:

```json
{
  "id": "compiti:account:data:hash",
  "text": "Compiti per domani: esercizi 1-5 di matematica"
}
```

Le richieste devono includere:

- `X-Publisher-Timestamp`: epoch Unix in millisecondi;
- `X-Publisher-Signature`: HMAC SHA-256 esadecimale di `<timestamp>.<corpo JSON esatto>`, calcolato con `shared_secret`.

Un ID già ricevuto con lo stesso testo restituisce lo stato esistente senza creare un secondo post. Lo stesso ID con testo differente viene rifiutato.

## Coda e recupero

Il database SQLite `/data/publisher.sqlite` usa gli stati `pending`, `sending`, `sent` e `failed`. Al riavvio, i job rimasti in `sending` tornano in coda. Un fallimento viene riprovato fino a `max_attempts`; poi diventa `failed` e non viene reinviato automaticamente.

Se il Canale non mostra un post, considera il job solo come “inviato al client” e verifica dal telefono dedicato. Non attivare l'automazione prima di aver verificato manualmente più invii reali e riavvii dell'add-on.
