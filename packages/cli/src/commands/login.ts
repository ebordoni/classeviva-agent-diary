/**
 * Comando: login
 * Effettua login e salva credenziali
 */

import { ClassevivaClient } from "@classeviva/core";
import chalk from "chalk";
import { Command } from "commander";
import { clearConfig, getCredentials, saveConfig } from "../utils/config.js";
import {
  createSpinner,
  printDebugError,
  printError,
  printInfo,
  printSuccess,
} from "../utils/formatter.js";

export function createLoginCommand(): Command {
  const command = new Command("login");

  command
    .description("Effettua login e salva le credenziali")
    .option("-u, --user <studentId>", "Student ID")
    .option("-p, --password <password>", "Password")
    .option("--no-save", "Non salvare le credenziali")
    .option("--clear", "Cancella credenziali salvate")
    .option("--debug", "Mostra dettagli errore completi")
    .action(async (options) => {
      let spinner;

      try {
        // Cancella credenziali se richiesto
        if (options.clear) {
          clearConfig();
          printSuccess("Credenziali cancellate");
          return;
        }

        // Ottieni credenziali
        spinner = createSpinner("Ottenimento credenziali...");
        spinner.start();

        const credentials = await getCredentials({
          studentId: options.user,
          password: options.password,
        });

        spinner.stop();

        // Effettua login
        spinner = createSpinner("Login in corso...");
        spinner.start();

        const client = new ClassevivaClient(
          credentials.studentId,
          credentials.password,
        );

        await client.accedi();

        spinner.succeed("Login effettuato con successo!");

        // Mostra info utente
        console.log(`\n👤 Benvenuto, ${client.nomeCompleto}!`);
        console.log(`   Student ID: ${credentials.studentId}`);

        // Salva credenziali se richiesto
        if (options.save !== false) {
          saveConfig({
            studentId: credentials.studentId,
            password: credentials.password,
          });
          printInfo("Credenziali salvate in ~/.classeviva/config.json");
        }

        printSuccess("Login completato");
      } catch (error: any) {
        // Ferma spinner se attivo
        if (spinner) {
          spinner.fail("Login fallito ");
        }

        if (options.debug) {
          printDebugError(error);
        }

        // Gestione errori specifici
        if (error.response?.status === 400) {
          printError(
            "Credenziali non valide",
            "Verifica che Student ID e Password siano corretti.\n  Lo Student ID deve iniziare con 'S' o 'G' seguito dal codice.",
          );
        } else if (error.response?.status === 422) {
          printError(
            "Password errata",
            "La password non corrisponde allo Student ID fornito.",
          );
        } else if (error.code === "ECONNREFUSED") {
          printError(
            "Connessione rifiutata",
            "Impossibile raggiungere il server Classeviva. Verifica la connessione internet.",
          );
        } else if (error.code === "ETIMEDOUT") {
          printError("Timeout", "Il server non risponde. Riprova più tardi.");
        } else {
          printError("Login fallito ", error);
        }

        if (!options.debug) {
          console.error(
            chalk.gray(
              "  Suggerimento: usa --debug per vedere dettagli completi\n",
            ),
          );
        }

        process.exit(1);
      }
    });

  return command;
}
