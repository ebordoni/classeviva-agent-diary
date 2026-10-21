import { sendClientError } from "../http.js";
import type { Request, Response } from "express";
import { Router } from "express";
import { getVoti } from "../cache.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const result = await getVoti(client);
    res.json({ ...result.data, fromCache: result.fromCache });
  } catch (err) {
    await sendClientError(req, res, err);
  }
});

export default router;
