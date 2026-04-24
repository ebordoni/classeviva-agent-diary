import { AIService, ClassevivaClient } from "@classeviva/core";
import type { Telegraf } from "telegraf";
import {
  getCompiti,
  getCredentials,
  getDigestSubscriptions,
  unsubscribeDigest,
} from "./cache.js";
import { formatCompiti } from "./format.js";

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function sendDailyDigest(bot: Telegraf, ai: AIService): Promise<void> {
  const chatIds = await getDigestSubscriptions();
  if (chatIds.length === 0) return;

  const oggi = todayStr();
  console.log(`[scheduler] Invio digest giornaliero a ${chatIds.length} chat`);

  for (const chatId of chatIds) {
    const creds = await getCredentials(chatId);
    if (!creds) {
      // Credenziali mancanti: rimuovi dalla lista
      await unsubscribeDigest(chatId);
      continue;
    }

    try {
      const client = new ClassevivaClient(creds.studentId, creds.password);
      await client.accedi();
      const { data } = await getCompiti(client, oggi, oggi, ai);

      if (data.compiti.length === 0) {
        await bot.telegram.sendMessage(
          chatId,
          "📅 <b>Digest giornaliero</b>\n\nNessun compito trovato per oggi. 🎉",
          { parse_mode: "HTML" },
        );
      } else {
        const corpo = formatCompiti(data, oggi, oggi);
        await bot.telegram.sendMessage(
          chatId,
          `📅 <b>Digest giornaliero</b>\n\n${corpo}`,
          { parse_mode: "HTML" },
        );
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[scheduler] Digest fallito per chatId=${chatId}: ${msg}`);
      // Non rimuoviamo l'iscrizione: potrebbe essere un errore temporaneo
    }
  }
}

/**
 * Avvia il digest giornaliero automatico.
 * @param time Orario nel formato "HH:MM" (es. "07:30")
 */
export function startScheduler(
  bot: Telegraf,
  time: string,
  aiApiKey?: string,
  aiProvider?: string,
): void {
  const parts = time.split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1] ?? "0", 10);

  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    console.error(`[scheduler] Orario non valido: "${time}". Digest disabilitato.`);
    return;
  }

  const ai = new AIService(aiApiKey, aiProvider);

  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const delay = next.getTime() - now.getTime();
    const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    console.log(
      `[scheduler] Prossimo digest alle ${hhmm} (tra ${Math.round(delay / 60000)} min)`,
    );

    setTimeout(async () => {
      await sendDailyDigest(bot, ai);
      scheduleNext();
    }, delay).unref();
  }

  scheduleNext();
}
