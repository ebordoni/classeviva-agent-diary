/**
 * Comando: voti
 * Recupera voti
 */

import { ClassevivaClient } from "@classeviva/core";
import { Command } from "commander";
import { getCredentials } from "../utils/config.js";
import {
  createSpinner,
  formatJSON,
  formatVotiTable,
  printError,
} from "../utils/formatter.js";

export function createVotiCommand(): Command {
  const command = new Command("voti");

  command
    .description("Recupera i voti")
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

        // Recupera voti
        const fetchSpinner = createSpinner("Recupero voti...");
        fetchSpinner.start();

        const voti = await client.voti();

        fetchSpinner.succeed(`Trovati ${voti.grades.length} voti`);

        // Output
        if (options.json) {
          formatJSON(voti);
        } else {
          formatVotiTable(voti.grades);
        }
      } catch (error: any) {
        printError("Errore recupero voti", error);
        process.exit(1);
      }
    });

  return command;
}
