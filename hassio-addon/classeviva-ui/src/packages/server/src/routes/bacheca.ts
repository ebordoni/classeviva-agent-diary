import type { Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const data = await client.bacheca();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

router.post(
  "/:eventCode/:pubId/leggi",
  requireAuth,
  async (req: Request, res: Response) => {
    const client = req.classeviva!;
    const { eventCode, pubId } = req.params as {
      eventCode: string;
      pubId: string;
    };
    try {
      const data = await client.bachecaLeggi(eventCode, parseInt(pubId, 10));
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore API";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
