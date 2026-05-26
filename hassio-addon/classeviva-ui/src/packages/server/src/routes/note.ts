import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const data = await client.note();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

router.post(
  "/:eventCode/:evtId/leggi",
  requireAuth,
  async (req: Request, res: Response) => {
    const client = req.classeviva!;
    const { eventCode, evtId } = req.params as {
      eventCode: string;
      evtId: string;
    };
    try {
      await client.leggiNota(eventCode, parseInt(evtId, 10));
      res.json({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore API";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
