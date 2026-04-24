/**
 * Gestione configurazione e credenziali CLI
 */

import { config as loadEnv } from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import inquirer from "inquirer";
import { homedir } from "os";
import { join } from "path";

loadEnv(); // Carica .env automaticamente
export interface CliConfig {
  studentId?: string;
  password?: string;
  aiProvider?: string;
  aiModel?: string;
  aiApiKey?: string;
}

const CONFIG_DIR = join(homedir(), ".classeviva");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Carica la configurazione
 */
export function loadConfig(): CliConfig {
  // Prima prova variabili d'ambiente
  const envConfig: CliConfig = {
    studentId: process.env.CLASSEVIVA_STUDENT_ID || process.env.STUDENT_ID,
    password: process.env.CLASSEVIVA_PASSWORD || process.env.PASSWORD,
    aiProvider: process.env.AI_PROVIDER,
    aiModel: process.env.AI_MODEL,
    aiApiKey: process.env.AI_API_KEY,
  };

  // Poi prova file di configurazione
  if (existsSync(CONFIG_FILE)) {
    try {
      const fileConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      return { ...fileConfig, ...envConfig }; // Env ha precedenza
    } catch (error) {
      console.error("Errore lettura config:", error);
    }
  }

  return envConfig;
}

/**
 * Salva la configurazione
 */
export function saveConfig(config: CliConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const existing = existsSync(CONFIG_FILE)
    ? JSON.parse(readFileSync(CONFIG_FILE, "utf-8"))
    : {};

  const merged = { ...existing, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

/**
 * Richiede credenziali interattivamente
 */
export async function promptCredentials(): Promise<{
  studentId: string;
  password: string;
}> {
  const config = loadConfig();

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "studentId",
      message: "Student ID:",
      default: config.studentId,
      validate: (input: string) =>
        input.length > 0 ? true : "Student ID obbligatorio",
    },
    {
      type: "password",
      name: "password",
      message: "Password:",
      default: config.password,
      validate: (input: string) =>
        input.length > 0 ? true : "Password obbligatoria",
    },
  ]);

  return answers;
}

/**
 * Ottiene le credenziali (da config o richiesta)
 */
export async function getCredentials(
  options: { studentId?: string; password?: string } = {},
): Promise<{ studentId: string; password: string }> {
  const config = loadConfig();

  const studentId = options.studentId || config.studentId;
  const password = options.password || config.password;

  if (studentId && password) {
    return { studentId, password };
  }

  // Richiedi interattivamente
  return promptCredentials();
}

/**
 * Cancella la configurazione
 */
export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, "{}");
  }
}
