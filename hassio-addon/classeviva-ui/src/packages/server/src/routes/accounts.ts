import { Router } from "express";
import { loadAccounts, publicAccount, removeAccount } from "../accounts.js";
import { accountClient, forgetClient } from "../clients.js";
import { asyncRoute, sendClientError } from "../http.js";
import { requireAuth } from "../middleware/auth.js";
import { probeSpidProfiles } from "../spid-profiles-probe.js";
import { activate } from "./auth.js";

const router = Router();
router.post("/spid/profiles-probe", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.get("X-Classeviva-Request") !== "1") return res.status(403).json({ error: "Richiesta non consentita." });
  return next();
}, requireAuth, asyncRoute(async (req, res) => {
  if (!req.classeviva?.esportaSessioneSpid()) return res.status(409).json({ error: "Apri prima un account collegato con SPID/CIE." });
  try {
    const accounts = await loadAccounts();
    return res.json(await probeSpidProfiles(req.classeviva, accounts.map(account => account.studentId)));
  } catch (error) { return sendClientError(req, res, error); }
}));

router.get("/", asyncRoute(async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  return res.json({ accounts: (await loadAccounts()).map(publicAccount) });
}));

router.delete("/:studentId", asyncRoute(async (req, res) => {
  const { studentId } = req.params;
  await removeAccount(studentId);
  forgetClient(studentId);
  if (req.session.activeStudentId === studentId) {
    req.session.activeStudentId = undefined;
    req.session.authenticated = false;
    req.session.manualLogout = true;
  }
  return res.json({ success: true });
}));

router.post("/switch/:studentId", asyncRoute(async (req, res) => {
  const { studentId } = req.params;
  const account = (await loadAccounts()).find(a => a.studentId === studentId);
  if (!account) return res.status(404).json({ error: "Account non trovato." });
  try {
    const client = await accountClient(studentId);
    await activate(req, studentId);
    return res.json({ success: true, user: { nome: client.nomeCompleto, ident: studentId,
      authType: account.authType === "spid" ? "spid" : "password" } });
  } catch (error) { return sendClientError(req, res, error, studentId); }
}));

export default router;
