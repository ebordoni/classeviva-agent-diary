/**
 * Comando: compiti
 * Estrae compiti con Vercel AI SDK
 */

import { AIService, ClassevivaClient, ultimiNGiorni } from "@classeviva/core";
import { Command } from "commander";
import { writeFileSync } from "fs";
import { getCredentials, loadConfig } from "../utils/config.js";
import {
    createSpinner,
    formatCompitiTable,
    formatJSON,
    printDebugError,
    printError,
    printInfo,
} from "../utils/formatter.js";

export function createCompitiCommand(): Command {
  const command = new Command("compiti");

  command
    .description("Estrae compiti dalle lezioni usando AI")
    .option("-l, --last <giorni>", "Ultimi N giorni", "10")
    .option("-s, --start <data>", "Data inizio (YYYY-MM-DD)")
    .option("-e, --end <data>", "Data fine (YYYY-MM-DD)")
    .option(
      "-P, --provider <provider>",
      "AI provider (openai|google|anthropic|groq|xai)",
    )
    .option("-m, --model <modello>", "Modello AI (es. gpt-4o-mini)")
    .option("-k, --api-key <key>", "API key del provider")
    .option("-o, --output <file>", "Salva risultati in file JSON")
    .option("-j, --json", "Output in formato JSON")
    .option(
      "-M, --by-materia",
      "Raggruppa per materia invece che per data di consegna",
    )
    .option("-u, --user <studentId>", "Student ID")
    .option("-p, --password <password>", "Password")
    .option(
      "--debug",
      "Mostra dettagli completi request/response in caso di errore",
    )
    .action(async (options) => {
      // ── Step 1: Login ──────────────────────────────────────────────────────
      const loginSpinner = createSpinner("Login Classeviva...");
      loginSpinner.start();

      let client: ClassevivaClient;
      try {
        const credentials = await getCredentials({
          studentId: options.user,
          password: options.password,
        });
        client = new ClassevivaClient(
          credentials.studentId,
          credentials.password,
        );
        await client.accedi();
        loginSpinner.succeed(`Connesso come: ${client.nomeCompleto}`);
      } catch (error: any) {
        loginSpinner.fail("Login fallito");
        if (options.debug) printDebugError(error);
        printError("Impossibile autenticarsi su Classeviva", error);
        process.exit(1);
      }

      // ── Step 2: Recupera lezioni ───────────────────────────────────────────
      const lezioniSpinner = createSpinner("Recupero lezioni...");
      lezioniSpinner.start();

      let lezioni;
      try {
        if (options.start && options.end) {
          lezioni = await client.lezioniDaA(options.start, options.end);
        } else {
          const { inizio, fine } = ultimiNGiorni(parseInt(options.last));
          lezioni = await client.lezioniDaA(inizio, fine);
        }
        lezioniSpinner.succeed(`Trovate ${lezioni.lessons.length} lezioni`);
      } catch (error: any) {
        lezioniSpinner.fail("Recupero lezioni fallito");
        if (options.debug) printDebugError(error);
        printError("Impossibile recuperare le lezioni", error);
        process.exit(1);
      }

      if (lezioni.lessons.length === 0) {
        printInfo("Nessuna lezione trovata nel periodo selezionato.");
        return;
      }

      // ── Step 3: Estrazione compiti con AI ──────────────────────────────────
      const config = loadConfig();
      const provider = options.provider || config.aiProvider || "openai";
      const model = options.model || config.aiModel;
      const apiKey = options.apiKey || config.aiApiKey;

      const ai = new AIService({ provider, model, apiKey });

      const aiSpinner = createSpinner(
        `Estrazione compiti con ${provider}${model ? `/${model}` : ""}...`,
      );
      aiSpinner.start();

      let compiti;
      try {
        compiti = await ai.estraiCompiti(lezioni);
        aiSpinner.succeed(
          `Estratti ${compiti.metadata.totale_compiti} compiti`,
        );
      } catch (error: any) {
        aiSpinner.fail("Estrazione AI fallita");
        if (options.debug) printDebugError(error);
        printError(
          `Errore durante la chiamata al provider AI (${provider})`,
          error,
        );
        process.exit(1);
      }

      // ── Output ─────────────────────────────────────────────────────────────
      if (options.json) {
        formatJSON(compiti);
      } else {
        formatCompitiTable(compiti.compiti, { byDate: !options.byMateria });

        console.log("📊 Statistiche:");
        console.log(
          `   Lezioni analizzate: ${compiti.metadata.totale_lezioni}`,
        );
        console.log(`   Compiti trovati: ${compiti.metadata.totale_compiti}`);
        console.log(`   Modello: ${compiti.metadata.modello_utilizzato}`);
        console.log();
      }

      if (options.output) {
        writeFileSync(options.output, JSON.stringify(compiti, null, 2));
        printInfo(`Risultati salvati in: ${options.output}`);
      }
    });

  return command;
}
