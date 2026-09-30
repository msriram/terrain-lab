import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const root = resolve("../_site"),
  output = resolve(process.env.EMERALD_QA_DIR || "/tmp/terrain-emerald-review");
await mkdir(output, { recursive: true });
const types = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://local").pathname;
    if (pathname === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    }
    if (!pathname.startsWith("/terrain-lab/")) {
      res.writeHead(404).end();
      return;
    }
    let path = resolve(root, "." + pathname.slice("/terrain-lab".length));
    if (path !== root && !path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(path)).isDirectory()) path += "/index.html";
    res.setHeader("Content-Type", types[extname(path)] || "text/plain");
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const base = `http://127.0.0.1:${server.address().port}/terrain-lab/`;
  await page.goto(base + "wildlife/?theme=emerald");
  await page.waitForFunction(
    () => window.animalDemo?.getMetrics().landscape.emeraldCitadels >= 5,
  );
  await page.locator("#labels").uncheck();
  await page.waitForTimeout(1800);
  await page
    .locator("#stage")
    .screenshot({ path: output + "/emerald-browser.png" });
  const metrics = await page.evaluate(() => animalDemo.getMetrics());
  assert.ok(metrics.landscape.emeraldRoads > 0);
  assert.ok(metrics.landscape.emeraldCitizens > 0);
  assert.ok(metrics.landscape.emeraldWitches > 0);
  assert.ok(metrics.landscape.emeraldWitchKills > 0);
  assert.equal(metrics.landscape.emeraldGuardians, 2);
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.emeraldRainbowOpacity > 0.3,
    { timeout: 10000 },
  );
  await page
    .locator("#stage")
    .screenshot({ path: output + "/emerald-rainbow.png" });
  await page.locator("#pause").click();
  const frozen = await page.evaluate(
    () => animalDemo.getMetrics().landscape.emeraldAnimationTime,
  );
  await page.waitForTimeout(180);
  assert.equal(
    await page.evaluate(
      () => animalDemo.getMetrics().landscape.emeraldAnimationTime,
    ),
    frozen,
  );
  await page.locator("#pause").click();
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.15, 0.43));
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.emeraldCitadels === 0,
  );
  assert.equal(
    await page.evaluate(
      () => animalDemo.getMetrics().landscape.emeraldCitizens,
    ),
    0,
  );
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.7, 0.43));
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.emeraldCitadels >= 5,
  );
  await page.waitForTimeout(500);
  await page
    .locator("#stage")
    .screenshot({ path: output + "/emerald-raised.png" });
  await page.goto(base + "sandbox/?theme=emerald");
  await page.waitForFunction(
    () =>
      window.TerrainWildlife?.layer.getStats().landscape.emeraldCitadels >= 5,
  );
  await page.locator("#labels").uncheck();
  await page.waitForTimeout(500);
  await page
    .locator(".stage-card")
    .screenshot({ path: output + "/emerald-sandbox.png" });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        output,
        metrics: metrics.landscape,
        drawCalls: metrics.drawCalls,
        fps: metrics.averageFPS,
        errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  await new Promise((ok) => server.close(ok));
}
