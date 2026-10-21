import { Router } from "express";
import { loadAccounts, publicAccount, removeAccount } from "../accounts.js";
import { accountClient, forgetClient } from "../clients.js";
import { asyncRoute, sendClientError } from "../http.js";
import { activate } from "./auth.js";

const router = Router();
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
