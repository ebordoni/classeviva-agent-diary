# Istruzioni per GitHub Copilot — Classeviva Agent Diary

## Lingua
Rispondi sempre in italiano.

## Struttura del progetto
- Monorepo TypeScript con npm workspaces
- I package principali sono in `packages/` (core, bot, cli, tui)
- L'addon Home Assistant è in `hassio-addon/classeviva-bot/`
  - I sorgenti Node.js dell'addon sono in `hassio-addon/classeviva-bot/src/`
  - I package dell'addon sono in `hassio-addon/classeviva-bot/src/packages/` (solo core e bot)

## Convenzioni

### Sincronizzazione addon
Quando modifichi `packages/bot/src/bot.ts`, `packages/bot/src/index.ts` o qualsiasi altro file sotto `packages/bot/src/` o `packages/core/src/`, sincronizza le modifiche nell'addon:
```
hassio-addon/classeviva-bot/src/packages/bot/src/
hassio-addon/classeviva-bot/src/packages/core/src/
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
