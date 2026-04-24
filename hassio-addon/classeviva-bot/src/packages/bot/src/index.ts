import { config as loadEnv } from "dotenv";
import { buildBot } from "./bot.js";
import { startScheduler } from "./scheduler.js";

loadEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Errore: TELEGRAM_BOT_TOKEN non impostato.");
  process.exit(1);
}

const allowedChatIds = process.env.ALLOWED_CHAT_IDS
  ? process.env.ALLOWED_CHAT_IDS.split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  : [];

const digestTime = process.env.DAILY_DIGEST_TIME?.trim() || undefined;

const bot = buildBot(
  token,
  process.env.AI_API_KEY,
  process.env.AI_PROVIDER,
  allowedChatIds,
  digestTime,
);

bot.launch();

if (digestTime) {
  startScheduler(bot, digestTime, process.env.AI_API_KEY, process.env.AI_PROVIDER);
  console.log(`📅 Digest giornaliero programmato alle ${digestTime}`);
}

console.log("🤖 Classeviva Bot avviato.");

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
