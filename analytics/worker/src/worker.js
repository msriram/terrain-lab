import { dashboardHtml, dashboardCss, dashboardJs } from "./dashboard.js";

const MODES = new Set(["home", "browser", "sandbox", "projector", "guide", "contribute"]);
const EVENTS = new Set([
  "page_view", "world_change", "rescue", "capture", "arrest", "terrain_edit",
  "population_change", "landscape_randomize", "kinect_connected",
  "kinect_failed", "kinect_disconnected", "projector_opened",
  "calibration_saved", "fps", "session_length",
]);
const DETAILS = {
  population_change: new Set(["0", "1-8", "9-16", "17-32", "33-64"]),
  fps: new Set(["under_15", "15-29", "30-44", "45_plus"]),
  session_length: new Set(["under_1m", "1-5m", "5-15m", "15m_plus"]),
  kinect_failed: new Set(["bridge_missing", "device_unavailable", "connection_lost"]),
};
const textEncoder = new TextEncoder();
const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
});
const page = (body, type) => new Response(body, {
  headers: {
    "Content-Type": `${type}; charset=utf-8`, "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  },
});
const redirect = (url, cookie) => new Response(null, {
  status: 302, headers: { Location: url, "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) },
});
const cookie = (name, value, age) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const cookies = (request) => Object.fromEntries((request.headers.get("Cookie") || "")
  .split(";").map(part => part.trim().split(/=(.*)/s).slice(0, 2)).filter(pair => pair[0]));
const base64url = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const decode64 = (value) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
async function signingKey(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw Error("SESSION_SECRET must have at least 32 characters");
  return crypto.subtle.importKey("raw", textEncoder.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function sessionCookie(env, id) {
  const payload = base64url(textEncoder.encode(JSON.stringify({ id, exp: Math.floor(Date.now() / 1000) + 43200 })));
  const signature = base64url(new Uint8Array(await crypto.subtle.sign("HMAC", await signingKey(env), textEncoder.encode(payload))));
  return cookie("__Host-terrain_session", `${payload}.${signature}`, 43200);
}
async function authorized(request, env) {
  const value = cookies(request)["__Host-terrain_session"];
  if (!value || value.length > 512) return false;
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const valid = await crypto.subtle.verify("HMAC", await signingKey(env), decode64(signature), textEncoder.encode(payload));
    if (!valid) return false;
    const session = JSON.parse(new TextDecoder().decode(decode64(payload)));
    return session.id === Number(env.OWNER_GITHUB_ID) && session.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}
function cors(env) {
  return { "Access-Control-Allow-Origin": env.SITE_ORIGIN, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}
function validEvent(data) {
  if (!data || !MODES.has(data.mode) || !EVENTS.has(data.event)) return false;
  if (typeof data.theme !== "string" || !/^[a-z0-9_-]{1,32}$/.test(data.theme)) return false;
  if (typeof data.detail !== "string" || data.detail.length > 32) return false;
  return DETAILS[data.event] ? DETAILS[data.event].has(data.detail) : data.detail === "none";
}
async function record(request, env) {
  if (request.headers.get("Origin") !== env.SITE_ORIGIN) return json({ error: "origin not allowed" }, 403);
  if (!env.DB) return json({ error: "analytics database unavailable" }, 503, cors(env));
  if (Number(request.headers.get("Content-Length") || 0) > 1024) return json({ error: "event too large" }, 413, cors(env));
  let data;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw Error("missing body");
    let body = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      body += new TextDecoder().decode(value);
      if (body.length > 1024) { await reader.cancel(); return json({ error: "event too large" }, 413, cors(env)); }
    }
    data = JSON.parse(body);
  } catch { return json({ error: "invalid event" }, 400, cors(env)); }
  if (!validEvent(data)) return json({ error: "invalid event" }, 400, cors(env));
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO daily_counts (day,mode,event,theme,detail,total) VALUES (?,?,?,?,?,1) ON CONFLICT(day,mode,event,theme,detail) DO UPDATE SET total=total+1")
    .bind(day, data.mode, data.event, data.theme, data.detail).run();
  return new Response(null, { status: 204, headers: { ...cors(env), "Cache-Control": "no-store" } });
}
async function login(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET) return json({ error: "GitHub login is not configured" }, 503);
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const callback = new URL("/auth/callback", request.url).href;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("state", state);
  return redirect(url.href, cookie("__Host-terrain_oauth_state", state, 600));
}
async function callback(request, env) {
  const url = new URL(request.url), state = url.searchParams.get("state");
  if (!state || state.length !== 43 || state !== cookies(request)["__Host-terrain_oauth_state"] || !url.searchParams.get("code"))
    return json({ error: "invalid OAuth state" }, 400);
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get("code"), redirect_uri: new URL("/auth/callback", request.url).href }),
  });
  if (!tokenResponse.ok) return json({ error: "GitHub sign-in failed" }, 502);
  const token = await tokenResponse.json();
  if (!token.access_token) return json({ error: "GitHub sign-in failed" }, 401);
  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/vnd.github+json", "User-Agent": "Terrain-Lab-Analytics" },
  });
  if (!userResponse.ok) return json({ error: "GitHub identity lookup failed" }, 502);
  const user = await userResponse.json();
  if (user.id !== Number(env.OWNER_GITHUB_ID)) return json({ error: "This dashboard belongs to the Terrain Lab owner" }, 403);
  const response = redirect(new URL("/dashboard", request.url).href, await sessionCookie(env, user.id));
  response.headers.append("Set-Cookie", cookie("__Host-terrain_oauth_state", "", 0));
  return response;
}
async function report(request, env) {
  if (!await authorized(request, env)) return json({ error: "sign in required" }, 401);
  if (!env.DB) return json({ error: "analytics database unavailable" }, 503);
  const days = Number(new URL(request.url).searchParams.get("days") || 30);
  if (![7, 30, 90].includes(days)) return json({ error: "invalid date range" }, 400);
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const [events, daily] = await Promise.all([
    env.DB.prepare("SELECT mode,event,theme,detail,SUM(total) AS total FROM daily_counts WHERE day >= ? GROUP BY mode,event,theme,detail ORDER BY total DESC LIMIT 1000").bind(cutoff).all(),
    env.DB.prepare("SELECT day,SUM(total) AS total FROM daily_counts WHERE day >= ? AND event = 'page_view' GROUP BY day ORDER BY day").bind(cutoff).all(),
  ]);
  return json({ days, events: events.results, daily: daily.results });
}
export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url), route = url.pathname;
      if (route === "/api/event" && request.method === "OPTIONS")
        return request.headers.get("Origin") === env.SITE_ORIGIN ? new Response(null, { status: 204, headers: cors(env) }) : json({ error: "origin not allowed" }, 403);
      if (route === "/api/event" && request.method === "POST") return record(request, env);
      if (route === "/login" && request.method === "GET") return login(request, env);
      if (route === "/auth/callback" && request.method === "GET") return callback(request, env);
      if (route === "/logout" && request.method === "POST") {
        if (request.headers.get("Origin") !== url.origin) return json({ error: "origin not allowed" }, 403);
        return redirect("/login", cookie("__Host-terrain_session", "", 0));
      }
      if (route === "/api/report" && request.method === "GET") return report(request, env);
      if (route === "/dashboard" && request.method === "GET") return await authorized(request, env) ? page(dashboardHtml, "text/html") : redirect("/login");
      if (route === "/dashboard.css" && request.method === "GET") return page(dashboardCss, "text/css");
      if (route === "/dashboard.js" && request.method === "GET") return page(dashboardJs, "text/javascript");
      return json({ error: "not found" }, 404);
    } catch { return json({ error: "analytics service unavailable" }, 500); }
  },
  async scheduled(_event, env) {
    if (env.DB) await env.DB.prepare("DELETE FROM daily_counts WHERE day < date('now', '-13 months')").run();
  },
};
