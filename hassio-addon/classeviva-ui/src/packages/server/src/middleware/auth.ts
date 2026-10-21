import type { ClassevivaClient } from "@classeviva/core";
import type { NextFunction, Request, Response } from "express";
import { accountClient } from "../clients.js";
import { sendClientError } from "../http.js";

declare module "express" { interface Request { classeviva?: ClassevivaClient } }

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const studentId = req.session.authenticated ? req.session.activeStudentId : undefined;
  if (!studentId) { res.status(401).json({ error: "Non autenticato.", code: "LOGIN_REQUIRED" }); return; }
  try { req.classeviva = await accountClient(studentId); next(); }
  catch (error) { await sendClientError(req, res, error).catch(next); }
}
