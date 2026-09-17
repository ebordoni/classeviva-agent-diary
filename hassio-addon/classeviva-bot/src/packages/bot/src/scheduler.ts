import { AIService, ClassevivaClient } from "@classeviva/core";
import type { CompitiEstrattiResponse } from "@classeviva/core";
import type { Telegraf } from "telegraf";
import {
  getCompiti,
  getCredentials,
  getDigestSubscriptions,
  unsubscribeDigest,
} from "./cache.js";
import { formatCompiti, formatCompitiWhatsApp } from "./format.js";
import {
  createWhatsAppDigestParts,
  WhatsAppPublisher,
} from "./whatsappPublisher.js";

function todayStr(): string {
  return dateStr(new Date());
}

function dateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function digestRange(days: number): { inizio: string; fine: string; days: number } {
  const normalizedDays = Number.isFinite(days)
    ? Math.min(Math.max(Math.trunc(days), 1), 90)
    : 31;
  const fine = new Date();
  const inizio = new Date(fine);
  inizio.setDate(inizio.getDate() - (normalizedDays - 1));
  return { inizio: dateStr(inizio), fine: dateStr(fine), days: normalizedDays };
}

/** Mantiene i compiti non scaduti e quelli senza una scadenza determinata. */
export function filterDigestHomework(
  data: CompitiEstrattiResponse,
  today: string,
): CompitiEstrattiResponse {
  const compiti = data.compiti.filter(
    (compito) => !compito.scadenza || compito.scadenza >= today,
  );
  return {
    ...data,
    compiti,
    metadata: { ...data.metadata, totale_compiti: compiti.length },
  };
}

async function sendDailyDigest(
  bot: Telegraf,
  ai: AIService,
  whatsappPublisher?: WhatsAppPublisher,
  digestDays = 31,
): Promise<void> {
  const chatIds = await getDigestSubscriptions();
  if (chatIds.length === 0) return;

  const oggi = todayStr();
  const range = digestRange(digestDays);
  console.log(
    `[scheduler] Invio digest giornaliero a ${chatIds.length} chat (ultimi ${range.days} giorni)`,
  );

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
      const { data } = await getCompiti(client, range.inizio, range.fine, ai);
      const compiti = filterDigestHomework(data, oggi);

      if (compiti.compiti.length === 0) {
        await bot.telegram.sendMessage(
          chatId,
          "📅 <b>Digest giornaliero</b>\n\nNessun compito in scadenza da oggi. 🎉",
          { parse_mode: "HTML" },
        );
      } else {
        const corpo = formatCompiti(compiti);
        await bot.telegram.sendMessage(
          chatId,
          `📅 <b>Digest giornaliero</b>\n\n${corpo}`,
          { parse_mode: "HTML" },
        );

        const whatsappText = formatCompitiWhatsApp(compiti);
        if (whatsappPublisher && whatsappText) {
          try {
            const parts = createWhatsAppDigestParts({
              studentId: creds.studentId,
              date: oggi,
              text: whatsappText,
            });
            for (const part of parts) await whatsappPublisher.publish(part);
            console.log(
              `[scheduler] Digest WhatsApp accodato per studentId=${creds.studentId} (${parts.length} messaggio/i)`,
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(
              `[scheduler] Invio WhatsApp fallito per studentId=${creds.studentId}: ${msg}`,
            );
          }
        }
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
  whatsappPublisher?: WhatsAppPublisher,
  digestDays = 31,
): void {
  const parts = time.split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1] ?? "0", 10);

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    console.error(
      `[scheduler] Orario non valido: "${time}". Digest disabilitato.`,
    );
    return;
  }

  const ai = new AIService({
    provider: (aiProvider as any) ?? "openai",
    apiKey: aiApiKey,
  });

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
      await sendDailyDigest(bot, ai, whatsappPublisher, digestDays);
      scheduleNext();
    }, delay).unref();
  }

  scheduleNext();
}
