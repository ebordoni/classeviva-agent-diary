#!/usr/bin/env node

/**
 * Classeviva CLI - Entry Point
 *
 * CLI tool per interagire con Classeviva da terminale
 */

import { VERSION } from "@classeviva/core";
import { Command } from "commander";
import "dotenv/config";
import { printBanner } from "./utils/formatter.js";

// Import comandi
import { createAgendaCommand } from "./commands/agenda.js";
import { createAssenzeCommand } from "./commands/assenze.js";
import { createCompitiCommand } from "./commands/compiti.js";
import { createLezioniCommand } from "./commands/lezioni.js";
import { createLoginCommand } from "./commands/login.js";
import { createMaterieCommand } from "./commands/materie.js";
import { createVotiCommand } from "./commands/voti.js";

// Crea programma principale
const program = new Command();

program
  .name("classeviva")
  .description("CLI tool per Classeviva - Registro Elettronico")
  .version(VERSION)
  .hook("preAction", () => {
    printBanner();
  });

// Registra comandi
program.addCommand(createLoginCommand());
program.addCommand(createLezioniCommand());
program.addCommand(createVotiCommand());
program.addCommand(createAssenzeCommand());
program.addCommand(createAgendaCommand());
program.addCommand(createCompitiCommand());
program.addCommand(createMaterieCommand());

// Aggiungi esempi nella help
program.addHelpText(
  "after",
  `

Esempi:
  $ classeviva login                           # Login interattivo
  $ classeviva login -u S1234567 -p password   # Login con credenziali
  $ classeviva lezioni                         # Lezioni ultimi 7 giorni
  $ classeviva lezioni -l 30                   # Lezioni ultimo mese
  $ classeviva lezioni -d 2024-01-15           # Lezioni di un giorno
  $ classeviva voti                            # Tutti i voti
  $ classeviva assenze                         # Tutte le assenze
  $ classeviva agenda                          # Eventi agenda
  $ classeviva compiti                         # Estrai compiti con AI (Ollama)
  $ classeviva compiti -l 15 -o compiti.json   # Ultimi 15 giorni, salva in file
  $ classeviva materie                         # Lista materie

Opzioni globali:
  -u, --user <studentId>     Student ID (da usare invece del login salvato)
  -p, --password <password>  Password (da usare invece del login salvato)
  -j, --json                 Output in formato JSON

Configurazione:
  Le credenziali vengono salvate in: ~/.classeviva/config.json
  Oppure usa variabili d'ambiente: CLASSEVIVA_STUDENT_ID, CLASSEVIVA_PASSWORD

Per maggiori informazioni: https://github.com/ebordoni/classeviva-diario
`,
);

// Parse arguments
program.parse(process.argv);

// Se nessun comando, mostra help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
