import type { Request, Response, NextFunction } from "express";
import type { ClassevivaClient } from "@classeviva/core";
import { getClientBySessionId } from "../session.js";

declare module "express" {
  interface Request {
    classeviva?: ClassevivaClient;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const client = getClientBySessionId(req.session.id);
  if (!client || !client.connesso) {
    res.status(401).json({ error: "Non autenticato" });
    return;
  }
  req.classeviva = client;
  next();
}
