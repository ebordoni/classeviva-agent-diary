/**
 * Comando: lezioni
 * Recupera lezioni
 */

import { ClassevivaClient, ultimiNGiorni } from "@classeviva/core";
import { Command } from "commander";
import { getCredentials } from "../utils/config.js";
import {
  createSpinner,
  formatJSON,
  formatLezioniTable,
  printError,
} from "../utils/formatter.js";

export function createLezioniCommand(): Command {
  const command = new Command("lezioni");

  command
    .description("Recupera le lezioni")
    .option("-d, --date <data>", "Data specifica (YYYY-MM-DD)")
    .option("-s, --start <data>", "Data inizio (YYYY-MM-DD)")
    .option("-e, --end <data>", "Data fine (YYYY-MM-DD)")
    .option("-l, --last <giorni>", "Ultimi N giorni", "7")
    .option("-m, --materia <id>", "Filtra per materia (ID)")
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

        // Recupera lezioni
        const fetchSpinner = createSpinner("Recupero lezioni...");
        fetchSpinner.start();

        let lezioni;

        if (options.date) {
          // Lezioni di un giorno specifico
          lezioni = await client.lezioniGiorno(options.date);
        } else if (options.start && options.end) {
          // Range di date
          if (options.materia) {
            lezioni = await client.lezioniDaAMateria(
              options.start,
              options.end,
              parseInt(options.materia)
            );
          } else {
            lezioni = await client.lezioniDaA(options.start, options.end);
          }
        } else {
          // Ultimi N giorni
          const { inizio, fine } = ultimiNGiorni(parseInt(options.last));
          lezioni = await client.lezioniDaA(inizio, fine);
        }

        fetchSpinner.succeed(`Trovate ${lezioni.lessons.length} lezioni`);

        // Output
        if (options.json) {
          formatJSON(lezioni);
        } else {
          formatLezioniTable(lezioni.lessons);

          // Statistiche
          const materieUnique = new Set(
            lezioni.lessons.map((l) => l.subjectDesc)
          );
          console.log(`📊 Materie: ${materieUnique.size}`);
          console.log(`   ${Array.from(materieUnique).join(", ")}\n`);
        }
      } catch (error: any) {
        printError("Errore recupero lezioni", error);
        process.exit(1);
      }
    });

  return command;
}
