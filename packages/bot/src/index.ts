import { config as loadEnv } from "dotenv";
import { buildBot } from "./bot.js";

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Errore: TELEGRAM_BOT_TOKEN non impostato.");
  process.exit(1);
}

const bot = buildBot(token, process.env.AI_API_KEY, process.env.AI_PROVIDER);

bot.launch();

console.log("🤖 Classeviva Bot avviato.");

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
