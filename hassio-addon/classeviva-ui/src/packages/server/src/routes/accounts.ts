import { ClassevivaClient } from "@classeviva/core";
import type { Request, Response } from "express";
import { Router } from "express";
import { loadAccounts, removeAccount } from "../accounts.js";
import { getClientByStudentId, setClientByStudentId } from "../session.js";

const router = Router();

// GET /api/accounts — lista account salvati (senza password)
router.get("/", async (_req: Request, res: Response) => {
  const accounts = await loadAccounts();
  res.json({
    accounts: accounts.map((a) => ({ studentId: a.studentId, nome: a.nome })),
  });
});

// DELETE /api/accounts/:studentId — rimuovi account
router.delete("/:studentId", async (req: Request, res: Response) => {
  const { studentId } = req.params;
  await removeAccount(studentId);
  res.json({ success: true });
});

// POST /api/accounts/switch/:studentId — cambia account attivo
router.post("/switch/:studentId", async (req: Request, res: Response) => {
  const { studentId } = req.params;
  const accounts = await loadAccounts();
  const account = accounts.find((a) => a.studentId === studentId);

  if (!account) {
    res.status(404).json({ error: "Account non trovato" });
    return;
  }

  let client = getClientByStudentId(studentId);
  if (!client || !client.connesso) {
    try {
      const newClient = new ClassevivaClient(studentId, account.password);
      await newClient.accedi();
      setClientByStudentId(studentId, newClient);
      client = newClient;
    } catch {
      res
        .status(401)
        .json({ error: "Impossibile autenticarsi con questo account" });
      return;
    }
  }

  req.session.activeStudentId = studentId;
  req.session.authenticated = true;

  res.json({
    success: true,
    user: { nome: client.nomeCompleto, ident: client.datiUtente!.ident },
  });
});

export default router;
