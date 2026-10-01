# Private Terrain Lab analytics

The public site remains on GitHub Pages. A separate Cloudflare Worker stores only aggregate event counts in D1 and serves the private dashboard. GitHub OAuth signs in the owner; authorization checks the immutable GitHub account ID `7992017` (`msriram`), not just a display name. GitHub OAuth access tokens are used once to verify identity and are not stored.

The dashboard is at `https://msriram.github.io/terrain-lab/analytics/` after configuration. Its sign-in link opens the Worker-hosted dashboard. The Pages landing page is public, but all analytics data and report APIs require the signed owner session. GitHub Pages cannot itself protect private data.

## What is counted

- Views by page/mode and theme, daily totals, world changes, population-size buckets.
- Terrain edits, randomizations, wildlife rescues and catches.
- Kinect connection outcomes, projector opens, calibration saves.
- Coarse FPS and session-length buckets.

No Kinect frames, sand geometry, screenshots, IP addresses, user agents, referrers, emails, or persistent visitor IDs are stored. The client honors Do Not Track and Global Privacy Control. These are event counts, not unique visitor counts. The event endpoint is public and can be spoofed by non-browser clients; enable Cloudflare rate limiting/WAF if traffic grows or bot pollution appears.

The public privacy notice is at `/terrain-lab/analytics/privacy.html`. A daily scheduled task deletes aggregate counts older than 13 months.

## One-time setup

1. Sign in to Cloudflare. In `analytics/worker`, copy `wrangler.toml.example` to `wrangler.toml`. The real config and `.dev.vars` are gitignored.
2. Create D1 with `npx wrangler d1 create terrain-lab-analytics`, and paste its database UUID into `wrangler.toml`.
3. Apply the schema: `npx wrangler d1 execute terrain-lab-analytics --remote --file schema.sql`.
4. Create a GitHub OAuth App under GitHub **Settings → Developer settings → OAuth Apps**. Set the homepage URL to `https://msriram.github.io/terrain-lab/`. Set the authorization callback URL to `https://YOUR-WORKER.workers.dev/auth/callback`. No extra account scopes are requested. Record the client ID and client secret.
5. From `analytics/worker`, set secrets with `npx wrangler secret put GITHUB_CLIENT_ID`, `npx wrangler secret put GITHUB_CLIENT_SECRET`, and `npx wrangler secret put SESSION_SECRET`. Generate `SESSION_SECRET` with at least 32 random characters; do not commit it.
6. Deploy from `analytics/worker` with `npx wrangler deploy`. Set `ANALYTICS_ENDPOINT` in [`config.js`](config.js) to the resulting HTTPS Worker origin (no trailing slash). Rebuild and publish GitHub Pages. Analytics remain disabled while that value is empty.
7. Open `/terrain-lab/analytics/`, sign in as `msriram`, and verify another GitHub account gets 403. Visit browser and sandbox modes; counts should start appearing. Run `npm test --prefix analytics/worker` before deploying changes.

The OAuth callback must be HTTPS and match the deployed Worker URL. Configure a custom domain only if you update the callback and endpoint together. Do not put the client secret, session secret, or GitHub access token in GitHub Pages, source files, or the browser.

To stop collection immediately, empty `ANALYTICS_ENDPOINT` and republish Pages. To erase history, delete the D1 database or clear its `daily_counts` table using the Cloudflare dashboard after backing up any desired totals.
