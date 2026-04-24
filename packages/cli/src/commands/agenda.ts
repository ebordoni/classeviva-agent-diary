/**
 * Comando: agenda
 * Recupera eventi agenda
 */

import { ClassevivaClient } from "@classeviva/core";
import { Command } from "commander";
import { getCredentials } from "../utils/config.js";
import {
  createSpinner,
  formatAgendaTable,
  formatJSON,
  printError,
} from "../utils/formatter.js";

export function createAgendaCommand(): Command {
  const command = new Command("agenda");

  command
    .description("Recupera eventi agenda (compiti, verifiche, eventi)")
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

        // Recupera agenda
        const fetchSpinner = createSpinner("Recupero agenda...");
        fetchSpinner.start();

        let agenda;

        if (options.start && options.end) {
          agenda = await client.agendaDaA(options.start, options.end);
        } else {
          agenda = await client.agenda();
        }

        fetchSpinner.succeed(`Trovati ${agenda.agenda.length} eventi`);

        // Output
        if (options.json) {
          formatJSON(agenda);
        } else {
          formatAgendaTable(agenda.agenda);
        }
      } catch (error: any) {
        printError("Errore recupero agenda", error);
        process.exit(1);
      }
    });

  return command;
}
