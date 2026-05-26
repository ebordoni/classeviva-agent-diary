import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getVoti } from "../cache.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const result = await getVoti(client);
    res.json({ ...result.data, fromCache: result.fromCache });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

export default router;
