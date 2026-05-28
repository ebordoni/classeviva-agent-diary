import type { AIProvider } from "@classeviva/core";
import { AIService, ultimiNGiorni } from "@classeviva/core";
import type { Request, Response } from "express";
import { Router } from "express";
import { getCachedCompiti, getCompiti } from "../cache.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/** GET /api/compiti?giorni=7 — restituisce i compiti già in cache (niente AI) */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  const giorni = parseInt((req.query.giorni as string) ?? "7", 10) || 7;
  const range = ultimiNGiorni(giorni);
  try {
    const data = await getCachedCompiti(
      client.datiUtente!.id,
      range.inizio,
      range.fine,
    );
    res.json({ ...data, fromCache: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore";
    res.status(500).json({ error: message });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;

  const body = req.body as {
    inizio?: string;
    fine?: string;
    giorni?: number;
    provider?: string;
    apiKey?: string;
    model?: string;
  };

  // AI config: request body ha precedenza sulle variabili d'ambiente
  const provider = (body.provider ??
    process.env.AI_PROVIDER ??
    "openai") as AIProvider;
  const apiKey = body.apiKey ?? process.env.AI_API_KEY ?? "";
  const model = body.model ?? process.env.AI_MODEL ?? undefined;

  if (!apiKey) {
    res.status(400).json({
      error:
        "API key AI non configurata. Configura ai_api_key nelle opzioni dell'addon o forniscila nella richiesta.",
    });
    return;
  }

  let dataInizio: string;
  let dataFine: string;

  if (body.inizio && body.fine) {
    dataInizio = body.inizio;
    dataFine = body.fine;
  } else {
    const n = body.giorni ?? 10;
    const range = ultimiNGiorni(n);
    dataInizio = range.inizio;
    dataFine = range.fine;
  }

  try {
    const ai = new AIService({ provider, apiKey, model });
    const result = await getCompiti(client, dataInizio, dataFine, ai);
    res.json({ ...result.data, fromCache: result.fromCache });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore AI";
    res.status(500).json({ error: message });
  }
});

export default router;
