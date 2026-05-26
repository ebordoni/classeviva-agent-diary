# Istruzioni per GitHub Copilot — Classeviva Agent Diary

## Lingua

Rispondi sempre in italiano.

## Struttura del progetto

- Monorepo TypeScript con npm workspaces
- I package principali sono in `packages/` (core, bot, cli, tui)
- L'addon Bot per Home Assistant è in `hassio-addon/classeviva-bot/`
  - I sorgenti Node.js dell'addon bot sono in `hassio-addon/classeviva-bot/src/`
  - I package dell'addon bot sono in `hassio-addon/classeviva-bot/src/packages/` (solo core e bot)
- L'addon Web UI per Home Assistant è in `hassio-addon/classeviva-ui/`
  - I sorgenti dell'addon UI sono in `hassio-addon/classeviva-ui/src/`
  - I package dell'addon UI sono in `hassio-addon/classeviva-ui/src/packages/` (core, server, ui)
  - `server` è un backend Express (Node.js) che espone le API REST sulla porta 8099
  - `ui` è il frontend React + Vite (compilato a file statici serviti da server)

## Convenzioni

### Sincronizzazione addon

Quando modifichi qualsiasi file sotto `packages/core/src/`, sincronizza le modifiche in entrambi gli addon:

```
hassio-addon/classeviva-bot/src/packages/core/src/
hassio-addon/classeviva-ui/src/packages/core/src/
```

Quando modifichi `packages/bot/src/` sincronizza solo nell'addon bot:

```
hassio-addon/classeviva-bot/src/packages/bot/src/
```

### Versionamento e changelog

Dopo ogni modifica significativa al bot:

1. Aggiorna la versione in `packages/bot/package.json`, `hassio-addon/classeviva-bot/src/packages/bot/package.json` e `hassio-addon/classeviva-bot/config.yaml`
2. Aggiungi una voce in `CHANGELOG.md` (root) e `hassio-addon/classeviva-bot/CHANGELOG.md`
3. Fai `git commit` e `git push origin main`

Il versioning segue SemVer: patch per fix, minor per nuove funzionalità.

### Git

- Usa messaggi di commit in inglese con prefisso convenzionale (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`)
- Non usare `--force` o `--no-verify` senza chiedere conferma

### Codice

- TypeScript strict
- Non aggiungere commenti, docstring o annotazioni di tipo a codice che non hai modificato
- Non aggiungere gestione degli errori per scenari impossibili
