import { AIService, ClassevivaClient, ultimiNGiorni } from "@classeviva/core";
import type { Context } from "telegraf";
import { Telegraf } from "telegraf";
import {
  clearLoginState,
  clearSavedStudentId,
  getAgenda,
  getAssenze,
  getCompiti,
  getLezioni,
  getLoginState,
  getMaterie,
  getSavedStudentId,
  getVoti,
  invalidateUser,
  saveStudentId,
  setLoginState,
} from "./cache.js";
import {
  formatAgenda,
  formatAssenze,
  formatCompiti,
  formatLezioni,
  formatMaterie,
  formatVoti,
} from "./format.js";
import { clearSession, getSession, updateSession } from "./session.js";

const HELP = `
<b>Comandi disponibili:</b>

🔐 <b>/login</b> — Avvia il login
🚪 <b>/logout</b> — Disconnetti e dimentica le credenziali

📚 <b>/lezioni</b> [giorni] — Lezioni degli ultimi N giorni (default: 7)
📝 <b>/voti</b> — Tutti i voti con media per materia
📅 <b>/assenze</b> — Assenze, ritardi, uscite anticipate
📌 <b>/agenda</b> — Compiti e verifiche in agenda
🤖 <b>/compiti</b> [giorni] — Estrai compiti con AI (default: 10 giorni)
📖 <b>/materie</b> — Lista materie e docenti
🔄 <b>/aggiorna</b> — Svuota la cache e forza dati aggiornati

❓ <b>/help</b> — Mostra questo messaggio
`.trim();

/** Costruisce il bot con tutti i command handler registrati */
export function buildBot(
  token: string,
  aiApiKey?: string,
  aiProvider?: string,
  allowedChatIds: number[] = [],
): Telegraf {
  const bot = new Telegraf(token);

  // ──────────────────────────────────────────────
  // Middleware whitelist: blocca tutti gli utenti non autorizzati
  // Se allowedChatIds è vuoto, l'accesso è aperto a tutti.
  // ──────────────────────────────────────────────
  if (allowedChatIds.length > 0) {
    bot.use(async (ctx, next) => {
      const chatId = ctx.chat?.id;
      if (!chatId || !allowedChatIds.includes(chatId)) {
        await ctx.reply("⛔ Non sei autorizzato a usare questo bot.").catch(() => {});
        return;
      }
      return next();
    });
  }

  // ──────────────────────────────────────────────
  // Gestione messaggi di testo libero (flusso login)
  // ──────────────────────────────────────────────
  bot.on("text", async (ctx, next) => {
    const chatId = ctx.chat.id;
    const loginState = await getLoginState(chatId);

    if (loginState?.step === "awaiting_studentId") {
      const studentId = ctx.message.text.trim();
      // Elimina subito il messaggio con lo student ID dalla chat
      await ctx.deleteMessage().catch(() => {});
      await setLoginState(chatId, {
        step: "awaiting_password",
        pendingStudentId: studentId,
      });
      await ctx.reply("🔑 Inserisci la <b>password</b>:", {
        parse_mode: "HTML",
      });
      return;
    }

    if (loginState?.step === "awaiting_password") {
      const password = ctx.message.text.trim();
      const studentId = loginState.pendingStudentId!;
      // Elimina subito il messaggio con la password dalla chat
      await ctx.deleteMessage().catch(() => {});
      await clearLoginState(chatId);

      await ctx.reply("⏳ Accesso in corso...");
      try {
        const client = new ClassevivaClient(studentId, password);
        await client.accedi();
        updateSession(chatId, { client });
        await saveStudentId(chatId, studentId);
        await ctx.reply(
          `✅ <b>Accesso effettuato!</b>\nBenvenuto, <b>${client.nomeCompleto}</b>.\n\nUsa /help per vedere i comandi disponibili.`,
          { parse_mode: "HTML" },
        );
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err);
        const responseData = err?.response?.data
          ? JSON.stringify(err.response.data)
          : null;
        console.error(
          `[bot] Login fallito per chatId=${chatId}: ${msg}`,
          responseData ? `| body: ${responseData}` : "",
        );
        const detail = responseData ?? msg;
        await ctx.reply(
          `❌ Login fallito: <code>${detail}</code>\n\nRiprova con /login.`,
          { parse_mode: "HTML" },
        );
      }
      return;
    }

    return next();
  });

  // ──────────────────────────────────────────────
  // /start
  // ──────────────────────────────────────────────
  bot.start(async (ctx) => {
    await ctx.reply(
      `👋 Benvenuto nel <b>Classeviva Bot</b>!\n\nUsa /login per accedere al registro.\n\n${HELP}`,
      { parse_mode: "HTML" },
    );
  });

  // ──────────────────────────────────────────────
  // /help
  // ──────────────────────────────────────────────
  bot.help(async (ctx) => {
    await ctx.reply(HELP, { parse_mode: "HTML" });
  });

  // ──────────────────────────────────────────────
  // /login — avvia flusso multi-step
  // ──────────────────────────────────────────────
  bot.command("login", async (ctx) => {
    const chatId = ctx.chat.id;
    clearSession(chatId);

    const savedId = await getSavedStudentId(chatId);
    if (savedId) {
      await setLoginState(chatId, {
        step: "awaiting_password",
        pendingStudentId: savedId,
      });
      await ctx.reply(
        `🔐 Bentornato! Uso lo Student ID salvato: <code>${savedId}</code>\n\nInserisci la <b>password</b>:`,
        { parse_mode: "HTML" },
      );
    } else {
      await setLoginState(chatId, { step: "awaiting_studentId" });
      await ctx.reply(
        "🔐 Inserisci il tuo <b>Student ID</b> (es. <code>S1234567</code>):",
        { parse_mode: "HTML" },
      );
    }
  });

  // ──────────────────────────────────────────────
  // /logout
  // ──────────────────────────────────────────────
  bot.command("logout", async (ctx) => {
    const chatId = ctx.chat.id;
    const session = getSession(chatId);
    if (session.client?.datiUtente?.ident) {
      await invalidateUser(session.client.datiUtente.ident);
    }
    await clearLoginState(chatId);
    await clearSavedStudentId(chatId);
    clearSession(chatId);
    await ctx.reply(
      "👋 Sessione terminata. Le credenziali sono state dimenticate.",
    );
  });

  // ──────────────────────────────────────────────
  // Helper: verifica autenticazione
  // ──────────────────────────────────────────────
  async function requireAuth(ctx: Context): Promise<ClassevivaClient | null> {
    const chatId = ctx.chat?.id;
    if (!chatId) return null;
    const session = getSession(chatId);
    if (!session.client) {
      await ctx.reply("🔒 Non sei autenticato. Usa /login per accedere.");
      return null;
    }
    return session.client;
  }

  // ──────────────────────────────────────────────
  // /lezioni [giorni]
  // ──────────────────────────────────────────────
  bot.command("lezioni", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    const args = ctx.message.text.split(" ");
    const giorni = parseInt(args[1] ?? "7", 10) || 7;

    await ctx.reply(`⏳ Carico le lezioni degli ultimi ${giorni} giorni...`);
    try {
      const { inizio, fine } = ultimiNGiorni(giorni);
      const { data, fromCache } = await getLezioni(client, inizio, fine);
      const msg = formatLezioni(data);
      const footer = fromCache ? "\n<i>📦 dati dalla cache</i>" : "";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /voti
  // ──────────────────────────────────────────────
  bot.command("voti", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    await ctx.reply("⏳ Carico i voti...");
    try {
      const { data, fromCache } = await getVoti(client);
      const msg = formatVoti(data);
      const footer = fromCache ? "\n<i>📦 dati dalla cache</i>" : "";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /assenze
  // ──────────────────────────────────────────────
  bot.command("assenze", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    await ctx.reply("⏳ Carico le assenze...");
    try {
      const { data, fromCache } = await getAssenze(client);
      const msg = formatAssenze(data);
      const footer = fromCache ? "\n<i>📦 dati dalla cache</i>" : "";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /agenda
  // ──────────────────────────────────────────────
  bot.command("agenda", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    await ctx.reply("⏳ Carico l'agenda...");
    try {
      const { data, fromCache } = await getAgenda(client);
      const msg = formatAgenda(data);
      const footer = fromCache ? "\n<i>📦 dati dalla cache</i>" : "";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /materie
  // ──────────────────────────────────────────────
  bot.command("materie", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    await ctx.reply("⏳ Carico le materie...");
    try {
      const { data, fromCache } = await getMaterie(client);
      const msg = formatMaterie(data);
      const footer = fromCache ? "\n<i>📦 dati dalla cache</i>" : "";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /compiti [giorni]
  // ──────────────────────────────────────────────
  bot.command("compiti", async (ctx) => {
    if (!aiApiKey) {
      await ctx.reply(
        "⚠️ Il comando /compiti richiede una API key AI.\nConfigura <code>AI_API_KEY</code> nelle variabili d'ambiente del bot.",
        { parse_mode: "HTML" },
      );
      return;
    }

    const client = await requireAuth(ctx);
    if (!client) return;

    const args = ctx.message.text.split(" ");
    const giorni = parseInt(args[1] ?? "10", 10) || 10;

    await ctx.reply(
      `⏳ Analizzo le lezioni degli ultimi ${giorni} giorni con AI...`,
    );
    try {
      const { inizio, fine } = ultimiNGiorni(giorni);
      const ai = new AIService({
        provider: (aiProvider as any) ?? "openai",
        apiKey: aiApiKey,
      });
      const { data: compiti, fromCache } = await getCompiti(
        client,
        inizio,
        fine,
        ai,
      );
      const msg = formatCompiti(compiti);
      const footer = fromCache
        ? "\n<i>📦 tutti i dati dalla cache</i>"
        : "\n<i>🤖 analisi AI completata (i risultati sono ora in cache)</i>";
      await ctx.reply(msg + footer, { parse_mode: "HTML" });
    } catch (err) {
      await ctx.reply(`❌ Errore: ${(err as Error).message}`);
    }
  });

  // ──────────────────────────────────────────────
  // /aggiorna — svuota la cache per l'utente corrente
  // ──────────────────────────────────────────────
  bot.command("aggiorna", async (ctx) => {
    const client = await requireAuth(ctx);
    if (!client) return;

    await invalidateUser(client.datiUtente!.ident);
    await ctx.reply(
      "🔄 Cache svuotata. I prossimi comandi recupereranno dati aggiornati da Classeviva.",
    );
  });

  // Registra i comandi nel menu "/" di Telegram
  bot.telegram
    .setMyCommands([
      { command: "login", description: "🔐 Accedi a Classeviva" },
      { command: "logout", description: "🚪 Disconnetti" },
      { command: "lezioni", description: "📚 Lezioni (default 7 giorni)" },
      { command: "voti", description: "📝 Voti con media per materia" },
      { command: "assenze", description: "📅 Assenze, ritardi, uscite" },
      { command: "agenda", description: "📌 Compiti e verifiche in agenda" },
      { command: "compiti", description: "🤖 Estrai compiti con AI" },
      { command: "materie", description: "📖 Lista materie e docenti" },
      { command: "aggiorna", description: "🔄 Svuota la cache dati" },
      { command: "help", description: "❓ Mostra i comandi disponibili" },
    ])
    .catch(() => {});

  return bot;
}
