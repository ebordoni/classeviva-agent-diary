import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getLezioni } from "../cache.js";
import { ultimiNGiorni } from "@classeviva/core";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  const { inizio, fine, giorni } = req.query as {
    inizio?: string;
    fine?: string;
    giorni?: string;
  };

  let dataInizio: string;
  let dataFine: string;

  if (inizio && fine) {
    dataInizio = inizio;
    dataFine = fine;
  } else {
    const n = parseInt(giorni ?? "7", 10);
    const range = ultimiNGiorni(n);
    dataInizio = range.inizio;
    dataFine = range.fine;
  }

  try {
    const result = await getLezioni(client, dataInizio, dataFine);
    res.json({ ...result.data, fromCache: result.fromCache });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

export default router;
