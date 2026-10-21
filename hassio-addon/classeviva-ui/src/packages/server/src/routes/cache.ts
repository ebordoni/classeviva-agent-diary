import { sendClientError } from "../http.js";
import type { Request, Response } from "express";
import { Router } from "express";
import { invalidateUser } from "../cache.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/invalida", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    await invalidateUser(client.datiUtente!.id);
    res.json({ success: true });
  } catch (err) {
    await sendClientError(req, res, err);
  }
});

export default router;
