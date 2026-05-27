import { ClassevivaClient } from "@classeviva/core";
import type { NextFunction, Request, Response } from "express";
import { getAccountPassword } from "../accounts.js";
import { getClientByStudentId, setClientByStudentId } from "../session.js";

declare module "express" {
  interface Request {
    classeviva?: ClassevivaClient;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const studentId = req.session.activeStudentId;
  if (!studentId) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }

  let client = getClientByStudentId(studentId);

  // Auto-reconnect se il client non è in memoria (es. dopo riavvio server)
  if (!client || !client.connesso) {
    const password = await getAccountPassword(studentId);
    if (!password) {
      res.status(401).json({ error: "Non autenticato" });
      return;
    }
    try {
      const newClient = new ClassevivaClient(studentId, password);
      await newClient.accedi();
      setClientByStudentId(studentId, newClient);
      client = newClient;
    } catch {
      res.status(401).json({ error: "Sessione scaduta, effettua il login" });
      return;
    }
  }

  req.classeviva = client;
  next();
}
