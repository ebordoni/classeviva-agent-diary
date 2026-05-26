import { Router } from "express";
import type { Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const data = await client.didattica();
    res.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Errore API";
    res.status(500).json({ error: message });
  }
});

router.get(
  "/:folderId",
  requireAuth,
  async (req: Request, res: Response) => {
    const client = req.classeviva!;
    const folderId = parseInt(req.params["folderId"] ?? "0", 10);
    try {
      const data = await client.didatticaElemento(folderId);
      res.json(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore API";
      res.status(500).json({ error: message });
    }
  },
);

export default router;
