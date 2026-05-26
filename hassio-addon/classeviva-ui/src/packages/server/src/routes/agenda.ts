import type { Request, Response } from "express";
import { Router } from "express";
import { getAgenda } from "../cache.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  const { inizio, fine } = req.query as { inizio?: string; fine?: string };

  let dataInizio: string;
  let dataFine: string;

  if (inizio && fine) {
    dataInizio = inizio;
    dataFine = fine;
  } else {
    // Default: da oggi a +30 giorni
    const oggi = new Date();
    const tra30 = new Date(oggi);
    tra30.setDate(oggi.getDate() + 30);
    dataInizio = oggi.toISOString().split("T")[0]!;
    dataFine = tra30.toISOString().split("T")[0]!;
  }

  try {
    const result = await getAgenda(client, dataInizio, dataFine);
    res.json({ ...result.data, fromCache: result.fromCache });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

export default router;
