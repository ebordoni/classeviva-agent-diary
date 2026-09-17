## 0.1.2 — 2026-09-17

- Configurazione semplificata: il bot accetta il link pubblico del Canale (`channel_url`) e ricava il JID dopo il pairing.
- Nuova sezione Ingress per verificare un link e visualizzare il JID risolto senza accedere al terminale.

## 0.1.1 — 2026-09-17

- Nuova icona e nome visualizzato **Classeviva WhatsApp Bot**.
- Lo slug tecnico resta `classeviva_whatsapp_publisher` per non interrompere configurazioni o installazioni esistenti.

## 0.1.0 — 2026-09-17

- Prima versione sperimentale: publisher testuale per Canali WhatsApp tramite Baileys.
- Coda SQLite persistente con deduplicazione, firma HMAC, limiti di invio e retry.
- Pairing QR disponibile esclusivamente tramite Home Assistant Ingress.
- L'integrazione automatica con il bot Telegram non è ancora abilitata.
