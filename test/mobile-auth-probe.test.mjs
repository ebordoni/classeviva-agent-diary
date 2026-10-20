import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createProbeServer, parsePaToken, probeLogin, probeRefresh, probeCallback, probeWebBridge, probeMobileCoverage, validateCallbackUrl, tokenMetadata } from "../scripts/probe-mobile-auth.mjs";

test("JWT diagnostics expose only timestamps, never identity claims or token values", () => {
  const payload = Buffer.from(JSON.stringify({ iat: 100, exp: 200, fiscalCode: "PRIVATE_IDENTITY", token: "PRIVATE_NESTED" })).toString("base64url");
  const token = `header.${payload}.signature`;
  const metadata = tokenMetadata(token, 300_000);
  assert.equal(metadata.expired, true);
  assert.equal(metadata.expiresAt, "1970-01-01T00:03:20.000Z");
  assert.deepEqual(tokenMetadata("opaque-token"), { jwt: false });
  assert.equal(JSON.stringify(metadata).includes("PRIVATE"), false);
  assert.equal(JSON.stringify(metadata).includes(token), false);
});

function callbackUrl(exp = Math.floor(Date.now() / 1000) + 120) {
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `https://web.spaggiari.eu/home/app/default/mspidauth.php?data=header.${payload}.signature`;
}

test("callback accepts only the official endpoint and rejects expired links before using the network", async () => {
  assert.equal(validateCallbackUrl(callbackUrl()).hostname, "web.spaggiari.eu");
  for (const invalid of [callbackUrl(1), callbackUrl().replace("web.spaggiari.eu", "example.com"),
    callbackUrl().replace("https:", "http:"), callbackUrl().replace("mspidauth.php", "login.php"),
    callbackUrl().replace("web.spaggiari.eu", "user:password@web.spaggiari.eu")]) {
    let calls = 0;
    await assert.rejects(probeCallback(invalid, async () => { calls++; }));
    assert.equal(calls, 0);
  }
});

test("callback exchanges its hidden token and carries the returned session cookie without exposing either", async () => {
  const requests = [];
  const result = await probeCallback(callbackUrl(), async (url, options) => {
    requests.push(url.pathname);
    if (url.pathname.endsWith("mspidauth.php")) return new Response('<input name="spid-patoken" value="PRIVATE_PA_TOKEN">', {
      headers: { "Set-Cookie": "PHPSESSID=PRIVATE_COOKIE; HttpOnly; Secure" },
    });
    assert.equal(options.headers.Cookie, "PHPSESSID=PRIVATE_COOKIE");
    if (url.pathname.endsWith("spidlogin")) {
      assert.deepEqual(JSON.parse(options.body), { pa: "PRIVATE_PA_TOKEN", rf: null });
      return Response.json({ token: "PRIVATE_ACCESS" });
    }
    return Response.json({ id: "123" });
  });
  assert.equal(result.publicResult.callback.tokenFound, true);
  assert.equal(result.publicResult.webIdentity.readable, true);
  assert.equal(requests[0], "/home/app/default/mspidauth.php");
  for (const secret of ["PRIVATE_PA_TOKEN", "PRIVATE_COOKIE", "PRIVATE_ACCESS"]) {
    assert.equal(JSON.stringify(result.publicResult).includes(secret), false);
  }
});

test("callback redirect to login is reported without following it", async () => {
  await assert.rejects(probeCallback(callbackUrl(), async (_url, options) => {
    assert.equal(options.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "/home/app/default/login.php" } });
  }), /callbackUnavailable/);
});

test("callback parser reads only its named input, handles quoting, and rejects masked tokens", () => {
  assert.equal(parsePaToken(`<input value='wrong' name='other'><input value='one&amp;two&#46;three' name='spid-patoken'>`), "one&two.three");
  assert.throws(() => parsePaToken(`<input name="spid-patoken" value="[redacted]">`));
  assert.throws(() => parsePaToken(`<input name="spid-patoken" value="first"><input name="spid-patoken" value="second">`));
  assert.throws(() => parsePaToken("<p>loading</p>"));
});

test("login keeps credentials private and validates actual lesson data without exposing it", async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url: String(url), options });
    assert.equal(url.origin, "https://web.spaggiari.eu");
    assert.equal(options.redirect, "error");
    if (url.pathname.endsWith("/spidlogin")) return Response.json({
      token: "ACCESS_SECRET", rtoken: "REFRESH_SECRET", ident: "G1234567A",
    });
    assert.equal(options.headers["Z-Auth-Token"], "ACCESS_SECRET");
    if (url.pathname.endsWith("/lessons/today")) return Response.json({ lessons: [{ lessonArg: "PRIVATE_LESSON" }] });
    if (url.pathname.endsWith("/whoami")) return Response.json({ id: "1234567", nome: "PRIVATE_NAME" });
    return Response.json({ ident: "G1234567A" });
  };
  const result = await probeLogin("PA_SECRET", request);
  assert.deepEqual(JSON.parse(calls[0].options.body), { pa: "PA_SECRET", rf: null });
  assert.equal(result.publicResult.mobileLessons.readable, true);
  assert.equal(result.publicResult.mobileLessons.count, 1);
  assert.equal(result.publicResult.webIdentity.readable, true);
  const output = JSON.stringify(result.publicResult);
  for (const secret of ["ACCESS_SECRET", "REFRESH_SECRET", "PA_SECRET", "PRIVATE_NAME", "PRIVATE_LESSON", "1234567"]) {
    assert.equal(output.includes(secret), false);
  }
});

test("API errors never expose an echoed token and do not trigger authenticated requests", async () => {
  let calls = 0;
  const result = await probeLogin("PRIVATE_TOKEN", async () => {
    calls++;
    return Response.json({ error: "Rejected PRIVATE_TOKEN", token: "SERVER_ECHO" }, { status: 401 });
  });
  assert.equal(calls, 1);
  assert.equal(result.session, null);
  assert.equal(result.publicResult.login.httpStatus, 401);
  assert.equal(JSON.stringify(result.publicResult).includes("PRIVATE_TOKEN"), false);
  assert.equal(JSON.stringify(result.publicResult).includes("SERVER_ECHO"), false);
});

test("refresh rotation replaces the in-memory credential before subsequent reads", async () => {
  const result = await probeRefresh({ paToken: "PA", accessToken: "OLD", refreshToken: "RF_OLD" }, async (url, options) => {
    if (url.pathname.endsWith("/spidrf")) {
      assert.deepEqual(JSON.parse(options.body), { pa: "PA", rf: "RF_OLD" });
      assert.equal(options.headers["Z-Auth-Token"], undefined);
      assert.equal(options.headers.Cookie, undefined);
      return Response.json({ token: "NEW", rtoken: "RF_NEW" });
    }
    assert.equal(options.headers["Z-Auth-Token"], "NEW");
    assert.equal(options.headers["Z-Spid-Rauth"], undefined);
    return Response.json({ id: "123" });
  });
  assert.equal(result.session.refreshToken, "RF_NEW");
  assert.equal(result.publicResult.webIdentity.readable, true);
});

test("web bridge carries its PHP session through official redirects without exposing credentials", async () => {
  const result = await probeWebBridge({ paToken: "PA", accessToken: "ACCESS", refreshToken: "RF" }, async (url, options) => {
    if (url.pathname.endsWith("/ticket")) return Response.json({ ticket: "PRIVATE_TICKET" });
    if (url.pathname.endsWith("restbridge.php")) {
      assert.equal(url.searchParams.get("t"), "PRIVATE_TICKET");
      assert.equal(options.headers["Z-Auth-Token"], undefined);
      return new Response(null, { status: 302, headers: { "Set-Cookie": "PHPSESSID=PRIVATE_COOKIE; HttpOnly; Secure", Location: "/home/app/default/index.php" } });
    }
    if (url.pathname.endsWith("index.php")) {
      assert.equal(options.headers.Cookie, "PHPSESSID=PRIVATE_COOKIE");
      return new Response("<p>PRIVATE_PAGE</p>");
    }
    if (url.pathname.endsWith("whoami")) return Response.json({ id: "123", nome: "PRIVATE_NAME" });
    return Response.json({ status: {} });
  });
  assert.equal(result.session.cookie, "PHPSESSID=PRIVATE_COOKIE");
  assert.equal(result.publicResult.webIdentity.readable, true);
  assert.deepEqual(result.publicResult.bridgeStatuses, [302, 200]);
  assert.equal(JSON.stringify(result.publicResult).includes("PRIVATE"), false);
});

test("web bridge never follows a redirect outside the official origin", async () => {
  const paths = [];
  const result = await probeWebBridge({ paToken: "PA", accessToken: "ACCESS", refreshToken: "RF" }, async (url) => {
    assert.equal(url.origin, "https://web.spaggiari.eu");
    paths.push(url.pathname);
    if (url.pathname.endsWith("/ticket")) return Response.json({ ticket: "PRIVATE_TICKET" });
    if (url.pathname.endsWith("restbridge.php")) return new Response(null, { status: 302, headers: { Location: "https://example.com/" } });
    return Response.json({});
  });
  assert.equal(result.publicResult.redirectBlocked, true);
  assert.equal(paths.includes("/"), false);
});

test("expired PA credentials are rejected locally before API exchange", async () => {
  const token = `header.${Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url")}.signature`;
  let calls = 0;
  const result = await probeLogin(token, async () => { calls++; });
  assert.equal(calls, 0);
  assert.equal(result.session, null);
  assert.equal(result.publicResult.failureReason, "expired");
  assert.equal(JSON.stringify(result.publicResult).includes(token), false);
});

test("mobile coverage checks are read-only and expose item shapes without private values", async () => {
  const paths = [];
  const result = await probeMobileCoverage({ ident: "G1234567A", accessToken: "PRIVATE_ACCESS" }, async (url, options) => {
    assert.equal(options.method, "GET");
    assert.equal(options.body, undefined);
    assert.equal(url.origin, "https://web.spaggiari.eu");
    paths.push(url.pathname);
    if (url.pathname.includes("/lessons/")) return Response.json({ lessons: [{ lessonArg: "PRIVATE_HOMEWORK", subjectId: 10 }] });
    return Response.json({ subjects: [] });
  }, new Date("2026-10-20T12:00:00Z"));
  assert.ok(paths.includes("/rest/v1/students/1234567/lessons/20261014/20261020"));
  assert.ok(paths.includes("/rest/v1/students/1234567/agenda/all/20261020/20261027"));
  assert.equal(paths.length, 7);
  assert.deepEqual(result.publicResult.coverage.lessonsRange.arrays.lessons, {
    count: 1, itemSchema: { lessonArg: "string", subjectId: "number" },
  });
  assert.equal(JSON.stringify(result.publicResult).includes("PRIVATE"), false);
  assert.equal(JSON.stringify(result.publicResult).includes("1234567"), false);
});

test("local server rejects cross-origin submissions before contacting Spaggiari", async (t) => {
  let requests = 0;
  const server = createProbeServer({ port: 18766, request: async () => { requests++; throw new Error("must not run"); } });
  server.listen(18766, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const page = await fetch("http://127.0.0.1:18766/");
  const html = await page.text();
  const csrf = /const csrf="([a-f0-9]+)"/.exec(html)[1];
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const response = await fetch("http://127.0.0.1:18766/probe", {
    method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json", "X-Probe-CSRF": csrf },
    body: JSON.stringify({ html: '<input name="spid-patoken" value="PRIVATE">' }),
  });
  assert.equal(response.status, 403);
  assert.equal(requests, 0);
});
