import { Router } from "express";
import type { Request, Response } from "express";
import { AIService } from "@classeviva/core";
import type { AIProvider } from "@classeviva/core";
import { requireAuth } from "../middleware/auth.js";
import { getCompiti } from "../cache.js";
import { ultimiNGiorni } from "@classeviva/core";

const router = Router();

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
  const provider = (body.provider ?? process.env.AI_PROVIDER ?? "openai") as AIProvider;
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
