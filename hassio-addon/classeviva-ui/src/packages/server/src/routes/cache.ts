import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { invalidateUser } from "../cache.js";

const router = Router();

router.post("/invalida", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    await invalidateUser(client.datiUtente!.ident);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore";
    res.status(500).json({ error: message });
  }
});

export default router;
