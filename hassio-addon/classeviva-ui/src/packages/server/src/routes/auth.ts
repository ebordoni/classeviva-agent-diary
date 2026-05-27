import { ClassevivaClient } from "@classeviva/core";
import type { Request, Response } from "express";
import { Router } from "express";
import { loadAccounts, upsertAccount } from "../accounts.js";
import { invalidateUser } from "../cache.js";
import { getClientByStudentId, setClientByStudentId } from "../session.js";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  const studentId = req.session.activeStudentId;
  const accounts = await loadAccounts();
  const publicAccounts = accounts.map((a) => ({
    studentId: a.studentId,
    nome: a.nome,
  }));

  if (!studentId || !req.session.authenticated) {
    res.json({ authenticated: false, accounts: publicAccounts });
    return;
  }

  const client = getClientByStudentId(studentId);
  if (!client || !client.connesso) {
    const saved = accounts.find((a) => a.studentId === studentId);
    res.json({
      authenticated: true,
      accounts: publicAccounts,
      user: { nome: saved?.nome ?? studentId, ident: studentId },
    });
    return;
  }

  res.json({
    authenticated: true,
    accounts: publicAccounts,
    user: {
      nome: client.nomeCompleto,
      ident: client.datiUtente!.ident,
    },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const body = req.body as { studentId?: string; password?: string };
  const { studentId, password } = body;

  if (!studentId || !password) {
    res.status(400).json({ error: "studentId e password richiesti" });
    return;
  }

  try {
    const client = new ClassevivaClient(studentId, password);
    await client.accedi();

    setClientByStudentId(studentId, client);
    req.session.activeStudentId = studentId;
    req.session.authenticated = true;

    await upsertAccount(studentId, password, client.nomeCompleto);

    res.json({
      success: true,
      user: {
        nome: client.nomeCompleto,
        ident: client.datiUtente!.ident,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Credenziali non valide";
    res.status(401).json({ error: message });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  const studentId = req.session.activeStudentId;
  if (studentId) {
    await invalidateUser(studentId);
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;

