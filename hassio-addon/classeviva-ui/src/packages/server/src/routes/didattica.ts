import { sendClientError } from "../http.js";
import type { Request, Response } from "express";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  try {
    const data = await client.didattica();
    res.json(data);
  } catch (err) {
    await sendClientError(req, res, err);
  }
});

router.get("/:folderId", requireAuth, async (req: Request, res: Response) => {
  const client = req.classeviva!;
  const folderId = parseInt(req.params["folderId"] ?? "0", 10);
  try {
    const data = await client.didatticaElemento(folderId);
    res.json(data);
  } catch (err) {
    await sendClientError(req, res, err);
  }
});

export default router;
