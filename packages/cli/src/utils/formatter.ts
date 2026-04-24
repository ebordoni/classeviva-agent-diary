/**
 * Utilities per output formattato
 */

import type {
    Assenza,
    CompitoEstratto,
    EventoAgenda,
    Lezione,
    Materia,
    Voto,
} from "@classeviva/core";
import chalk from "chalk";
import Table from "cli-table3";

/**
 * Formatta lezioni come tabella
 */
export function formatLezioniTable(lezioni: Lezione[]): void {
  if (lezioni.length === 0) {
    console.log(chalk.yellow("Nessuna lezione trovata."));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan("Data"),
      chalk.cyan("Ora"),
      chalk.cyan("Materia"),
      chalk.cyan("Docente"),
      chalk.cyan("Argomento"),
    ],
    colWidths: [12, 8, 25, 25, 50],
    wordWrap: true,
  });

  lezioni.forEach((lezione) => {
    table.push([
      lezione.evtDate,
      lezione.evtHPos ? `Ora ${lezione.evtHPos}` : "-",
      lezione.subjectDesc,
      lezione.authorName || "-",
      lezione.lessonArg
        ? lezione.lessonArg.substring(0, 100) +
          (lezione.lessonArg.length > 100 ? "..." : "")
        : "-",
    ]);
  });

  console.log(table.toString());
  console.log(chalk.green(`\n✓ Totale lezioni: ${lezioni.length}\n`));
}

/**
 * Formatta voti come tabella
 */
export function formatVotiTable(voti: Voto[]): void {
  if (voti.length === 0) {
    console.log(chalk.yellow("Nessun voto trovato."));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan("Data"),
      chalk.cyan("Materia"),
      chalk.cyan("Voto"),
      chalk.cyan("Tipo"),
      chalk.cyan("Note"),
    ],
    colWidths: [12, 25, 10, 20, 40],
    wordWrap: true,
  });

  voti.forEach((voto) => {
    const votoValue = voto.displayValue || voto.decimalValue?.toString() || "-";
    const color = parseFloat(votoValue) >= 6 ? chalk.green : chalk.red;

    table.push([
      voto.evtDate,
      voto.subjectDesc,
      color(votoValue),
      voto.componentDesc || "-",
      voto.notesForFamily || "-",
    ]);
  });

  console.log(table.toString());

  // Calcola media
  const valoriNumerici = voti
    .map((v) => v.decimalValue)
    .filter((v): v is number => v !== undefined && v > 0);

  if (valoriNumerici.length > 0) {
    const media =
      valoriNumerici.reduce((a, b) => a + b, 0) / valoriNumerici.length;
    const mediaColor = media >= 6 ? chalk.green : chalk.red;
    console.log(chalk.bold(`\nMedia: ${mediaColor(media.toFixed(2))}`));
  }

  console.log(chalk.green(`\n✓ Totale voti: ${voti.length}\n`));
}

/**
 * Formatta assenze come tabella
 */
export function formatAssenzeTable(assenze: Assenza[]): void {
  if (assenze.length === 0) {
    console.log(chalk.yellow("Nessuna assenza trovata."));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan("Data"),
      chalk.cyan("Tipo"),
      chalk.cyan("Ora"),
      chalk.cyan("Giustificato"),
      chalk.cyan("Note"),
    ],
    colWidths: [12, 20, 8, 15, 40],
    wordWrap: true,
  });

  assenze.forEach((assenza) => {
    const giustificato = assenza.isJustified
      ? chalk.green("Sì")
      : chalk.red("No");

    table.push([
      assenza.evtDate,
      assenza.evtCode,
      assenza.evtHPos ? `Ora ${assenza.evtHPos}` : "Tutto il giorno",
      giustificato,
      assenza.justifReasonDesc || "-",
    ]);
  });

  console.log(table.toString());

  // Statistiche
  const giustificate = assenze.filter((a) => a.isJustified).length;
  const daGiustificare = assenze.length - giustificate;

  console.log(chalk.bold("\nStatistiche:"));
  console.log(`  Giustificate: ${chalk.green(giustificate)}`);
  console.log(`  Da giustificare: ${chalk.red(daGiustificare)}`);
  console.log(chalk.green(`\n✓ Totale eventi: ${assenze.length}\n`));
}

/**
 * Formatta agenda come tabella
 */
export function formatAgendaTable(eventi: EventoAgenda[]): void {
  if (eventi.length === 0) {
    console.log(chalk.yellow("Nessun evento in agenda."));
    return;
  }

  const table = new Table({
    head: [
      chalk.cyan("Data Inizio"),
      chalk.cyan("Data Fine"),
      chalk.cyan("Tipo"),
      chalk.cyan("Note"),
      chalk.cyan("Autore"),
    ],
    colWidths: [12, 12, 15, 40, 25],
    wordWrap: true,
  });

  eventi.forEach((evento) => {
    table.push([
      evento.evtDatetimeBegin.split(" ")[0],
      evento.evtDatetimeEnd.split(" ")[0],
      evento.evtCode,
      evento.notes || "-",
      evento.authorName || "-",
    ]);
  });

  console.log(table.toString());
  console.log(chalk.green(`\n✓ Totale eventi: ${eventi.length}\n`));
}

/**
 * Formatta materie come tabella
 */
export function formatMaterieTable(materie: Materia[]): void {
  if (materie.length === 0) {
    console.log(chalk.yellow("Nessuna materia trovata."));
    return;
  }

  const table = new Table({
    head: [chalk.cyan("Materia"), chalk.cyan("Docenti")],
    colWidths: [40, 60],
    wordWrap: true,
  });

  materie.forEach((materia) => {
    table.push([materia.description, materia.teachers.join(", ")]);
  });

  console.log(table.toString());
  console.log(chalk.green(`\n✓ Totale materie: ${materie.length}\n`));
}

/**
 * Formatta compiti estratti
 */
export function formatCompitiTable(
  compiti: CompitoEstratto[],
  options: { byDate?: boolean } = { byDate: true },
): void {
  if (compiti.length === 0) {
    console.log(chalk.yellow("Nessun compito trovato."));
    return;
  }

  const oggi = new Date().toISOString().split("T")[0];

  function scadenzaColor(scadenza: string) {
    return scadenza < oggi
      ? chalk.red
      : scadenza === oggi
        ? chalk.yellow
        : chalk.green;
  }

  function printCompito(
    compito: CompitoEstratto,
    index: number,
    showMateria: boolean,
  ) {
    console.log(`\n${index + 1}. ${compito.testo}`);
    if (showMateria) {
      console.log(
        `   ${chalk.gray("Materia:")}  ${chalk.cyan(compito.materia)}`,
      );
    }
    console.log(`   ${chalk.gray("Assegnato:")} ${compito.data_lezione}`);
    console.log(
      `   ${chalk.gray("Scadenza:")}  ${scadenzaColor(compito.scadenza)(compito.scadenza)}`,
    );
    if (compito.note) {
      console.log(`   ${chalk.gray("Note:")}     ${compito.note}`);
    }
  }

  if (options.byDate) {
    // Raggruppa per data di consegna
    const sorted = [...compiti].sort((a, b) =>
      a.scadenza.localeCompare(b.scadenza),
    );
    const perData = sorted.reduce(
      (acc, compito) => {
        if (!acc[compito.scadenza]) acc[compito.scadenza] = [];
        acc[compito.scadenza].push(compito);
        return acc;
      },
      {} as Record<string, CompitoEstratto[]>,
    );

    console.log(chalk.bold.cyan("\n📅 COMPITI PER DATA DI CONSEGNA\n"));

    for (const [data, compitiData] of Object.entries(perData)) {
      const label =
        data < oggi
          ? chalk.red(data)
          : data === oggi
            ? chalk.yellow(data)
            : chalk.green(data);
      console.log(chalk.bold(`\nConsegna: ${label}`));
      console.log("═".repeat(80));
      compitiData.forEach((compito, index) =>
        printCompito(compito, index, true),
      );
    }
  } else {
    // Raggruppa per materia (comportamento originale)
    const perMateria = compiti.reduce(
      (acc, compito) => {
        if (!acc[compito.materia]) acc[compito.materia] = [];
        acc[compito.materia].push(compito);
        return acc;
      },
      {} as Record<string, CompitoEstratto[]>,
    );

    console.log(chalk.bold.cyan("\n📚 COMPITI PER MATERIA\n"));

    for (const [materia, compitiMateria] of Object.entries(perMateria)) {
      console.log(chalk.bold.yellow(`\n${materia.toUpperCase()}`));
      console.log("═".repeat(80));
      compitiMateria.forEach((compito, index) =>
        printCompito(compito, index, false),
      );
    }
  }

  console.log("\n" + "═".repeat(80));
  console.log(chalk.green(`\n✓ Totale compiti: ${compiti.length}\n`));
}

/**
 * Formatta output JSON
 */
export function formatJSON(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Progress spinner con messaggio
 */
export function createSpinner(text: string) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  let interval: NodeJS.Timeout;

  return {
    start() {
      process.stdout.write("\n");
      interval = setInterval(() => {
        process.stdout.write(`\r${chalk.cyan(frames[i])} ${text}`);
        i = (i + 1) % frames.length;
      }, 80);
    },
    succeed(msg?: string) {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green("✓")} ${msg || text}\n`);
    },
    fail(msg?: string) {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.red("✗")} ${msg || text}\n`);
    },
    stop() {
      clearInterval(interval);
      process.stdout.write("\r\x1b[K"); // Clear line
    },
  };
}

/**
 * Banner CLI
 */
export function printBanner(): void {
  console.log(chalk.cyan.bold("\n┌─────────────────────────────────────┐"));
  console.log(chalk.cyan.bold("│  Classeviva CLI v2.0                │"));
  console.log(chalk.cyan.bold("│  Registro Elettronico da Terminale  │"));
  console.log(chalk.cyan.bold("└─────────────────────────────────────┘\n"));
}

/**
 * Messaggio di errore
 */
export function printError(message: string, error?: any): void {
  console.error(chalk.red.bold("\n✗ ") + chalk.bold(message));

  if (!error) {
    console.error();
    return;
  }

  // Errore già con messaggio leggibile (ClassevivaError, AIError, ecc.)
  if (error.message && typeof error.message === "string") {
    console.error(chalk.red(`  → ${error.message}`));
  }

  // Suggerimenti contestuali in base al tipo di errore
  const msg: string = error.message || "";
  const code: string = error.code || "";
  const errorName: string = error.name || "";

  if (
    errorName === "PasswordNonValida" ||
    msg.includes("password") ||
    msg.includes("combacia")
  ) {
    console.error(
      chalk.yellow(
        "  Suggerimento: verifica le credenziali con 'classeviva login'",
      ),
    );
  } else if (errorName === "TokenNonValido" || errorName === "TokenScaduto") {
    console.error(
      chalk.yellow(
        "  Suggerimento: il token è scaduto, esegui di nuovo 'classeviva login'",
      ),
    );
  } else if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT"
  ) {
    console.error(
      chalk.yellow("  Suggerimento: verifica la connessione a internet"),
    );
  } else if (
    msg.includes("API key") ||
    msg.includes("api_key") ||
    msg.includes("Unauthorized") ||
    msg.includes("401")
  ) {
    console.error(
      chalk.yellow(
        "  Suggerimento: controlla che la variabile d'ambiente dell'API key sia impostata",
      ),
    );
    console.error(chalk.gray("    OpenAI   → OPENAI_API_KEY"));
    console.error(chalk.gray("    Google   → GOOGLE_GENERATIVE_AI_API_KEY"));
    console.error(chalk.gray("    Anthropic→ ANTHROPIC_API_KEY"));
    console.error(chalk.gray("    Groq     → GROQ_API_KEY"));
    console.error(chalk.gray("    xAI      → XAI_API_KEY"));
  } else if (msg.includes("model") && msg.includes("not found")) {
    console.error(
      chalk.yellow("  Suggerimento: verifica il nome del modello con --model"),
    );
  }

  console.error();
}

/**
 * Messaggio di successo
 */
export function printSuccess(message: string): void {
  console.log(chalk.green.bold("\n✓ ") + message + "\n");
}

/**
 * Messaggio informativo
 */
export function printInfo(message: string): void {
  console.log(chalk.blue.bold("\nℹ ") + message + "\n");
}

/**
 * Messaggio di warning
 */
export function printWarning(message: string): void {
  console.log(chalk.yellow.bold("\n⚠ ") + message + "\n");
}

/**
 * Debug: stampa dettagli completi di request e response
 */
export function printDebugError(error: any): void {
  console.error(
    chalk.gray(
      "\n┌─── DEBUG ──────────────────────────────────────────────────────",
    ),
  );

  // Request
  if (error.config) {
    console.error(chalk.gray("│ REQUEST"));
    console.error(
      chalk.gray(
        `│   ${(error.config.method || "GET").toUpperCase()} ${error.config.url || ""}`,
      ),
    );
    if (error.config.headers) {
      console.error(chalk.gray("│   Headers:"));
      for (const [k, v] of Object.entries(error.config.headers)) {
        if (k.toLowerCase() === "z-auth-token" || k.toLowerCase() === "cookie")
          continue; // non loggare token/cookie
        console.error(chalk.gray(`│     ${k}: ${v}`));
      }
    }
    if (error.config.data) {
      try {
        const body =
          typeof error.config.data === "string"
            ? JSON.parse(error.config.data)
            : error.config.data;
        // maschera la password
        if (body.pass) body.pass = "***";
        console.error(chalk.gray(`│   Body: ${JSON.stringify(body)}`));
      } catch {
        console.error(chalk.gray(`│   Body: ${error.config.data}`));
      }
    }
  }

  // Response
  if (error.response) {
    console.error(chalk.gray("│"));
    console.error(chalk.gray("│ RESPONSE"));
    console.error(
      chalk.gray(
        `│   Status: ${error.response.status} ${error.response.statusText || ""}`,
      ),
    );
    if (error.response.headers) {
      const ct = error.response.headers["content-type"];
      if (ct) console.error(chalk.gray(`│   Content-Type: ${ct}`));
    }
    console.error(
      chalk.gray(`│   Body: ${JSON.stringify(error.response.data)}`),
    );
  }

  console.error(
    chalk.gray(`│ Error: ${error.message} (code: ${error.code || "n/a"})`),
  );
  console.error(
    chalk.gray(
      "└────────────────────────────────────────────────────────────────\n",
    ),
  );
}
