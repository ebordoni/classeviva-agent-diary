import "dotenv/config";
import express from "express";
import session from "express-session";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncConfigAccounts } from "./accounts.js";
import accountsRouter from "./routes/accounts.js";
import agendaRouter from "./routes/agenda.js";
import assenzeRouter from "./routes/assenze.js";
import authRouter from "./routes/auth.js";
import bachecaRouter from "./routes/bacheca.js";
import cacheRouter from "./routes/cache.js";
import compitiRouter from "./routes/compiti.js";
import didatticaRouter from "./routes/didattica.js";
import lezioniRouter from "./routes/lezioni.js";
import materieRouter from "./routes/materie.js";
import noteRouter from "./routes/note.js";
import votiRouter from "./routes/voti.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = parseInt(process.env.PORT ?? "8099", 10);

// Genera un session secret se non configurato
const sessionSecret =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

app.set("trust proxy", 1);
app.use(express.json());

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 giorni
    },
  }),
);

// API routes
app.use("/api/auth", authRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/lezioni", lezioniRouter);
app.use("/api/voti", votiRouter);
app.use("/api/assenze", assenzeRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/materie", materieRouter);
app.use("/api/compiti", compitiRouter);
app.use("/api/note", noteRouter);
app.use("/api/bacheca", bachecaRouter);
app.use("/api/didattica", didatticaRouter);
app.use("/api/cache", cacheRouter);

// Serve static UI (Vite build output)
const uiDistPath =
  process.env.UI_DIST_PATH ?? path.resolve(__dirname, "../../ui/dist");

app.use(express.static(uiDistPath));

// SPA fallback: tutte le route non-API servono index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(uiDistPath, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[classeviva-ui] Server avviato su porta ${port}`);

  // Sincronizza account da configurazione addon (ACCOUNTS_CONFIG env var)
  const raw = process.env.ACCOUNTS_CONFIG;
  if (raw) {
    try {
      const configAccounts = JSON.parse(raw) as Array<{
        student_id: string;
        password: string;
      }>;
      if (Array.isArray(configAccounts) && configAccounts.length > 0) {
        syncConfigAccounts(configAccounts).then(() => {
          console.log(
            `[classeviva-ui] Sincronizzati ${configAccounts.length} account da configurazione`,
          );
        });
      }
    } catch {
      console.warn("[classeviva-ui] ACCOUNTS_CONFIG non valido, ignorato");
    }
  }
});
