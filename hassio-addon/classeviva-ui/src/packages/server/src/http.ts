import { AccessoSpidRichiesto, ErroreHTTP, FunzionalitaNonDisponibile, NonAccesso } from "@classeviva/core";
import type { Request, Response, RequestHandler } from "express";
import { invalidateSpidClient } from "./clients.js";

export const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve().then(() => handler(req, res)).catch(next); };

export async function sendClientError(req: Request, res: Response, error: unknown, targetStudentId = req.session.activeStudentId): Promise<void> {
  if (error instanceof AccessoSpidRichiesto) {
    req.session.authenticated = false;
    req.session.manualLogout = true;
    try { if (targetStudentId) await invalidateSpidClient(targetStudentId); }
    catch { res.status(503).json({ error: "Impossibile aggiornare la sessione salvata. Riprova." }); return; }
    res.status(401).json({ error: "Completa nuovamente il collegamento SPID/CIE.", code: "SPID_LOGIN_REQUIRED" });
  } else if (error instanceof NonAccesso) {
    req.session.authenticated = false;
    req.session.manualLogout = true;
    res.status(401).json({ error: "Sessione scaduta, effettua il login.", code: "LOGIN_REQUIRED" });
  } else if (error instanceof FunzionalitaNonDisponibile) {
    res.status(409).json({ error: error.message, code: "FEATURE_UNAVAILABLE" });
  } else {
    res.status(error instanceof ErroreHTTP && error.statusCode === 503 ? 503 : 502)
      .json({ error: "Richiesta non completata. Riprova tra poco." });
  }
}
