import { Router } from "express";
import type { Request, Response } from "express";
import { ClassevivaClient } from "@classeviva/core";
import {
  setClientBySessionId,
  clearClientBySessionId,
  getClientBySessionId,
} from "../session.js";
import {
  saveStudentId,
  getSavedStudentId,
  clearSavedStudentId,
  invalidateUser,
} from "../cache.js";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  const sessionId = req.session.id;
  const client = getClientBySessionId(sessionId);

  if (!client || !client.connesso) {
    const savedStudentId = await getSavedStudentId();
    res.json({ authenticated: false, savedStudentId: savedStudentId ?? null });
    return;
  }

  res.json({
    authenticated: true,
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

    setClientBySessionId(req.session.id, client);
    req.session.studentId = studentId;
    req.session.authenticated = true;

    await saveStudentId(studentId);

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
  const studentId = req.session.studentId;
  clearClientBySessionId(req.session.id);
  if (studentId) {
    await clearSavedStudentId();
    await invalidateUser(studentId);
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
