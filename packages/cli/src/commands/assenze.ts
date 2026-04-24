/**
 * Comando: assenze
 * Recupera assenze
 */

import { ClassevivaClient } from "@classeviva/core";
import { Command } from "commander";
import { getCredentials } from "../utils/config.js";
import {
  createSpinner,
  formatAssenzeTable,
  formatJSON,
  printError,
} from "../utils/formatter.js";

export function createAssenzeCommand(): Command {
  const command = new Command("assenze");

  command
    .description("Recupera assenze, ritardi, uscite anticipate")
    .option("-s, --start <data>", "Data inizio (YYYY-MM-DD)")
    .option("-e, --end <data>", "Data fine (YYYY-MM-DD)")
    .option("-j, --json", "Output in formato JSON")
    .option("-u, --user <studentId>", "Student ID")
    .option("-p, --password <password>", "Password")
    .action(async (options) => {
      try {
        // Login
        const spinner = createSpinner("Login...");
        spinner.start();

        const credentials = await getCredentials({
          studentId: options.user,
          password: options.password,
        });

        const client = new ClassevivaClient(
          credentials.studentId,
          credentials.password
        );

        await client.accedi();
        spinner.succeed(`Connesso: ${client.nomeCompleto}`);

        // Recupera assenze
        const fetchSpinner = createSpinner("Recupero assenze...");
        fetchSpinner.start();

        let assenze;

        if (options.start && options.end) {
          assenze = await client.assenzeDaA(options.start, options.end);
        } else if (options.start) {
          assenze = await client.assenzeDa(options.start);
        } else {
          assenze = await client.assenze();
        }

        fetchSpinner.succeed(`Trovati ${assenze.events.length} eventi`);

        // Output
        if (options.json) {
          formatJSON(assenze);
        } else {
          formatAssenzeTable(assenze.events);
        }
      } catch (error: any) {
        printError("Errore recupero assenze", error);
        process.exit(1);
      }
    });

  return command;
}
