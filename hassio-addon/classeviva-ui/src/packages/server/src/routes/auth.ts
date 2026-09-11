import { ClassevivaClient } from "@classeviva/core";
import type { Request, Response } from "express";
import { Router } from "express";
import { loadAccounts, upsertAccount } from "../accounts.js";
import { invalidateUser } from "../cache.js";
import { getClientByStudentId, setClientByStudentId } from "../session.js";

const router = Router();

router.get("/me", async (req: Request, res: Response) => {
  let studentId = req.session.activeStudentId;
  const accounts = await loadAccounts();
  const publicAccounts = accounts.map((a) => ({
    studentId: a.studentId,
    nome: a.nome,
  }));

  // Auto-login: se la sessione non è autenticata ma esistono account da config, effettua il login automatico
  // (salvo che l'utente abbia fatto logout esplicitamente in questa sessione)
  if ((!studentId || !req.session.authenticated) && !req.session.manualLogout) {
    const configAccount = accounts.find((a) => a.fromConfig);
    if (configAccount) {
      try {
        let client = getClientByStudentId(configAccount.studentId);
        if (!client || !client.connesso) {
          client = new ClassevivaClient(
            configAccount.studentId,
            configAccount.password,
          );
          await client.accedi();
          setClientByStudentId(configAccount.studentId, client);
          await upsertAccount(
            configAccount.studentId,
            configAccount.password,
            client.nomeCompleto,
          );
        }
        req.session.activeStudentId = configAccount.studentId;
        req.session.authenticated = true;
        studentId = configAccount.studentId;
      } catch {
        // credenziali non valide, mostra la schermata di login
      }
    }
  }

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
      ident: studentId,
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
    req.session.manualLogout = false;

    await upsertAccount(studentId, password, client.nomeCompleto);

    res.json({
      success: true,
      user: {
        nome: client.nomeCompleto,
        ident: studentId,
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
  // Non usiamo session.destroy(): dobbiamo mantenere la sessione per ricordare
  // che l'utente ha fatto logout esplicito e impedire il re-login automatico da config
  req.session.activeStudentId = undefined;
  req.session.authenticated = false;
  req.session.manualLogout = true;
  req.session.save((err) => {
    res.json({ success: !err });
  });
});

export default router;
