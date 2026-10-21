import { AccessoSpidRichiesto, ClassevivaClient, NonAccesso } from "@classeviva/core";
import type { Request } from "express";
import { Router } from "express";
import { loadAccounts, publicAccount, saveSpidAccount, upsertAccount } from "../accounts.js";
import { invalidateUser } from "../cache.js";
import { accountClient, forgetClient, persistSpidSession } from "../clients.js";
import { asyncRoute, sendClientError } from "../http.js";
import { getClientByStudentId, setClientByStudentId } from "../session.js";
import { SpidPairing } from "../spid-pairing.js";

const router = Router();
const pairing = new SpidPairing();

export async function activate(req: Request, studentId: string): Promise<void> {
  await new Promise<void>((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
  req.session.activeStudentId = studentId;
  req.session.authenticated = true;
  req.session.manualLogout = false;
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}

router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

router.get("/me", asyncRoute(async (req, res) => {
  const accounts = await loadAccounts();
  let studentId = req.session.authenticated ? req.session.activeStudentId : undefined;
  if (!studentId && !req.session.manualLogout) {
    studentId = accounts.find(a => a.authType === "spid" && !a.needsLogin)?.studentId
      ?? accounts.find(a => a.fromConfig)?.studentId;
  }
  if (!studentId) return res.json({ authenticated: false, accounts: accounts.map(publicAccount) });
  try {
    const client = await accountClient(studentId);
    req.session.activeStudentId = studentId;
    req.session.authenticated = true;
    const account = accounts.find(a => a.studentId === studentId);
    return res.json({ authenticated: true, accounts: accounts.map(publicAccount), user: {
      nome: client.nomeCompleto, ident: studentId, authType: account?.authType === "spid" ? "spid" : "password",
    } });
  } catch (error) {
    if (error instanceof NonAccesso || !accounts.some(a => a.studentId === studentId)) {
      req.session.authenticated = false;
      return res.json({ authenticated: false, accounts: (await loadAccounts()).map(publicAccount) });
    }
    // Il rifiuto delle vecchie credenziali deve mostrare il login, non nascondere gli account.
    if (accounts.find(a => a.studentId === studentId)?.authType !== "spid") {
      return res.json({ authenticated: false, accounts: accounts.map(publicAccount) });
    }
    return res.status(503).json({ error: "Impossibile ripristinare la sessione. Riprova tra poco." });
  }
}));

router.post("/login", asyncRoute(async (req, res) => {
  const { studentId, password } = req.body ?? {};
  if (typeof studentId !== "string" || typeof password !== "string" || !studentId || !password) {
    return res.status(400).json({ error: "Student ID e password richiesti." });
  }
  try {
    const client = new ClassevivaClient(studentId, password);
    await client.accedi();
    await upsertAccount(studentId, password, client.nomeCompleto);
    setClientByStudentId(studentId, client);
    await activate(req, studentId);
    return res.json({ success: true, user: { nome: client.nomeCompleto, ident: studentId, authType: "password" } });
  } catch { return res.status(401).json({ error: "Accesso non riuscito. Verifica le credenziali o usa SPID/CIE." }); }
}));

router.post("/spid/start", asyncRoute(async (req, res) => {
  if (req.get("X-Classeviva-Request") !== "1") return res.status(403).json({ error: "Richiesta non consentita." });
  req.session.spidLinkStartedAt = Date.now();
  const entry = pairing.start(req.sessionID);
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  return res.json(entry);
}));

router.post("/spid/complete", asyncRoute(async (req, res) => {
  if (req.get("X-Classeviva-Request") !== "1") return res.status(403).json({ error: "Richiesta non consentita." });
  const { nonce, paToken } = req.body ?? {};
  if (!pairing.consume(req.sessionID, nonce) || typeof paToken !== "string" || !paToken || paToken.length > 32_768) {
    return res.status(400).json({ error: "Collegamento assente, scaduto o già utilizzato. Avvialo nuovamente." });
  }
  try {
    let linked = false;
    const client = await ClassevivaClient.accediConSpid(paToken, {
      onSpidSessionChanged: updated => linked ? persistSpidSession(updated) : undefined,
    });
    const session = client.esportaSessioneSpid()!;
    await saveSpidAccount(session, client.nomeCompleto);
    forgetClient(session.ident);
    linked = true;
    setClientByStudentId(session.ident, client);
    await activate(req, session.ident);
    return res.json({ success: true, user: { nome: client.nomeCompleto, ident: session.ident, authType: "spid" } });
  } catch (error) {
    if (error instanceof AccessoSpidRichiesto) {
      return res.status(401).json({ error: "Il login SPID/CIE è scaduto o non valido. Ripeti il collegamento.", code: "SPID_LOGIN_REQUIRED" });
    }
    return res.status(503).json({ error: "Collegamento non completato o salvataggio non riuscito. Riprova." });
  }
}));

router.post("/spid/cancel", asyncRoute(async (req, res) => {
  if (req.get("X-Classeviva-Request") !== "1") return res.status(403).json({ error: "Richiesta non consentita." });
  pairing.cancel(req.sessionID);
  return res.json({ success: true });
}));

router.post("/logout", asyncRoute(async (req, res) => {
  pairing.cancel(req.sessionID);
  const studentId = req.session.activeStudentId;
  if (studentId) {
    const client = getClientByStudentId(studentId);
    if (client?.datiUtente?.id) await invalidateUser(client.datiUtente.id);
  }
  req.session.activeStudentId = undefined;
  req.session.authenticated = false;
  req.session.manualLogout = true;
  await new Promise<void>((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
  return res.json({ success: true });
}));

// Utilizzato dai test HTTP e dal server; gli errori delle route non espongono credenziali.
export { sendClientError };
export default router;
