import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { dashboardHtml, dashboardJs } from "../src/dashboard.js";

const origin = "https://msriram.github.io";
const workerUrl = "https://terrain-lab-analytics.example.workers.dev";
const rows = [];
const env = {
  SITE_ORIGIN: origin, SITE_URL: `${origin}/terrain-lab/`, OWNER_GITHUB_ID: "7992017",
  GITHUB_CLIENT_ID: "test-client", GITHUB_CLIENT_SECRET: "test-secret",
  SESSION_SECRET: "test-secret-with-at-least-thirty-two-characters",
  DB: { prepare(sql) { return { bind(...args) { return {
    async run() { rows.push(args); },
    async all() { return { results: [] }; },
  }; } }; } },
};
const call = (path, options) => worker.fetch(new Request(workerUrl + path, options), env);

test("public dashboard and reports require an owner session", async () => {
  assert.equal((await call("/dashboard")).status, 302);
  assert.equal((await call("/api/report")).status, 401);
  assert.equal((await call("/dashboard.js")).status, 200);
});

test("dashboard charts are bundled without third-party scripts", () => {
  assert.match(dashboardHtml, /id="daily"/);
  assert.match(dashboardHtml, /id="modes"/);
  assert.match(dashboardJs, /function dailyChart/);
  assert.match(dashboardJs, /function modeChart/);
  assert.match(dashboardHtml, /id="fps"/);
  assert.match(dashboardHtml, /id="sessions"/);
  assert.doesNotMatch(dashboardHtml, /id="quality"/);
  assert.doesNotMatch(dashboardHtml, /https:\/\/[^" ]+\.js/);
  assert.doesNotThrow(() => new Function(dashboardJs));
});

test("finer quality buckets are accepted while old buckets remain readable", async () => {
  for (const [event, detail] of [["fps", "50-59"], ["session_length", "10-20m"], ["fps", "30-44"], ["session_length", "1-5m"]]) {
    const response = await call("/api/event", { method: "POST", headers: { Origin: origin }, body: JSON.stringify({ mode: "browser", event, theme: "earth", detail }) });
    assert.equal(response.status, 204);
  }
});

test("event intake accepts only fixed, non-identifying fields from the site", async () => {
  rows.length = 0;
  const good = { mode: "browser", event: "rescue", theme: "earth", detail: "none" };
  assert.equal((await call("/api/event", { method: "POST", headers: { Origin: origin }, body: JSON.stringify(good) })).status, 204);
  assert.deepEqual(rows[0].slice(1), ["browser", "rescue", "earth", "none"]);
  assert.equal((await call("/api/event", { method: "POST", headers: { Origin: "https://other.example" }, body: JSON.stringify(good) })).status, 403);
  assert.equal((await call("/api/event", { method: "POST", headers: { Origin: origin }, body: JSON.stringify({ ...good, detail: "visitor@example.com" }) })).status, 400);
  assert.equal(rows.length, 1);
});

test("GitHub OAuth validates state and the immutable owner ID", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const start = await call("/login");
    const state = new URL(start.headers.get("Location")).searchParams.get("state");
    const stateCookie = start.headers.get("Set-Cookie").split(";")[0];
    assert.equal(state.length, 43);
    const invalid = await call(`/auth/callback?code=ok&state=wrong`, { headers: { Cookie: stateCookie } });
    assert.equal(invalid.status, 400);
    globalThis.fetch = async url => url.includes("access_token")
      ? Response.json({ access_token: "temporary-test-token" })
      : Response.json({ id: 123, login: "not-owner" });
    const denied = await call(`/auth/callback?code=ok&state=${state}`, { headers: { Cookie: stateCookie } });
    assert.equal(denied.status, 403);
    globalThis.fetch = async url => url.includes("access_token")
      ? Response.json({ access_token: "temporary-test-token" })
      : Response.json({ id: 7992017, login: "renamed-owner" });
    const approved = await call(`/auth/callback?code=ok&state=${state}`, { headers: { Cookie: stateCookie } });
    assert.equal(approved.status, 302);
    const session = approved.headers.getSetCookie().find(value => value.startsWith("__Host-terrain_session=")).split(";")[0];
    assert.equal((await call("/api/report?days=30", { headers: { Cookie: session } })).status, 200);
    const tampered = session.replace(/(session=)[^.]/, "$1X");
    assert.equal((await call("/api/report?days=30", { headers: { Cookie: tampered } })).status, 401);
  } finally { globalThis.fetch = originalFetch; }
});

test("scheduled cleanup removes aggregates older than 13 months", async () => {
  let cleanupSql = "";
  await worker.scheduled({}, { DB: { prepare(sql) { cleanupSql = sql; return { async run() {} }; } } });
  assert.match(cleanupSql, /DELETE FROM daily_counts/);
  assert.match(cleanupSql, /-13 months/);
});
