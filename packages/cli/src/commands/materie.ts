/**
 * Comando: materie
 * Recupera materie
 */

import { ClassevivaClient } from "@classeviva/core";
import { Command } from "commander";
import { getCredentials } from "../utils/config.js";
import {
  createSpinner,
  formatJSON,
  formatMaterieTable,
  printError,
} from "../utils/formatter.js";

export function createMaterieCommand(): Command {
  const command = new Command("materie");

  command
    .description("Recupera tutte le materie studiate")
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

        // Recupera materie
        const fetchSpinner = createSpinner("Recupero materie...");
        fetchSpinner.start();

        const materie = await client.materie();

        fetchSpinner.succeed(`Trovate ${materie.subjects.length} materie`);

        // Output
        if (options.json) {
          formatJSON(materie);
        } else {
          formatMaterieTable(materie.subjects);
        }
      } catch (error: any) {
        printError("Errore recupero materie", error);
        process.exit(1);
      }
    });

  return command;
}
