# Contribuire

Grazie per voler migliorare Classeviva.js. Il repository è un monorepo npm con TypeScript e richiede Node.js 22 o superiore.

## Avvio rapido

```bash
git clone https://github.com/ebordoni/classeviva-agent-diary.git
cd classeviva-agent-diary
npm ci
npm run check
npm test
```

`npm ci` è il comando da usare per un'installazione riproducibile: il `package-lock.json` nella root è la fonte di verità delle dipendenze.

## Struttura e responsabilità

| Percorso | Contenuto |
| --- | --- |
| `packages/core` | Client REST Classeviva, modelli e servizio AI condiviso. |
| `packages/cli` | Interfaccia a riga di comando pubblicata come `@classeviva/cli`. |
| `packages/bot` | Bot Telegram. |
| `hassio-addon/classeviva-bot` | Manifest, immagine e copia eseguibile del bot per Home Assistant. |
| `hassio-addon/classeviva-ui` | Add-on Home Assistant con server Express e frontend React/Vite. |
| `scripts/verify-addon-sources.mjs` | Controllo delle copie dei sorgenti condivisi. |

## Sorgenti sincronizzati

Le seguenti directory sono copie del codice sorgente principale e devono avere contenuto identico:

| Sorgente | Copie |
| --- | --- |
| `packages/core/src` | `hassio-addon/classeviva-bot/src/packages/core/src`, `hassio-addon/classeviva-ui/src/packages/core/src` |
| `packages/bot/src` | `hassio-addon/classeviva-bot/src/packages/bot/src` |

Il workflow GitHub **Sync HA Addon Sources** aggiorna le copie automaticamente quando un push su `main` modifica i sorgenti o i manifest correlati. In locale, esegui sempre:

```bash
npm run verify:addon-sources
```

Non modificare soltanto una copia: modifica prima il sorgente in `packages/` e mantieni sincronizzati i percorsi sopra. Il backend e il frontend della UI sono invece specifici dell'add-on e vivono in `hassio-addon/classeviva-ui/src/packages/server` e `.../ui`.

## Controlli prima della pull request

```bash
npm run verify:addon-sources
npm run check
npm test
```

La CI esegue gli stessi controlli e poi costruisce le immagini Docker di `classeviva-bot` e `classeviva-ui`. Se modifichi Dockerfile, `run.sh` o i sorgenti della UI, verifica anche la build dell'add-on interessato con Docker quando disponibile.

## Versioni, changelog e commit

- Usa messaggi Conventional Commits in inglese, ad esempio `fix(ui): ...` o `docs: ...`.
- Una modifica funzionale dell'add-on richiede l'aggiornamento della sua versione in `config.yaml` e della relativa sezione in `CHANGELOG.md`.
- Aggiorna anche il changelog di root per modifiche rilevanti per gli utenti.
- Le sole modifiche di documentazione non richiedono una nuova versione.

Non inserire credenziali Classeviva, token Telegram o chiavi API nei commit, negli esempi o nei log condivisi.
