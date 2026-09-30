import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";

const root = resolve("../_site"),
  output = resolve(process.env.COPPER_QA_DIR || "/tmp/terrain-copper-review");
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
  await page.goto(base + "wildlife/?theme=copper");
  await page.waitForFunction(
    () => window.animalDemo?.getMetrics().landscape.copperBuildings > 20,
  );
  await page.locator("#labels").uncheck();
  await page.waitForTimeout(2400);
  await page
    .locator("#stage")
    .screenshot({ path: output + "/copper-browser.png" });
  const metrics = await page.evaluate(() => animalDemo.getMetrics());
  assert.ok(metrics.landscape.copperAutomatons > 0);
  assert.ok(metrics.landscape.copperSteamVents > 0);
  assert.ok(metrics.landscape.copperRuins > 0);
  await page.locator("#pause").click();
  const frozen = await page.evaluate(
    () => animalDemo.getMetrics().landscape.copperAnimationTime,
  );
  await page.waitForTimeout(180);
  assert.equal(
    await page.evaluate(
      () => animalDemo.getMetrics().landscape.copperAnimationTime,
    ),
    frozen,
  );
  await page.locator("#pause").click();
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.15, 0.43));
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.copperBuildings === 0,
  );
  assert.equal(
    await page.evaluate(
      () => animalDemo.getMetrics().landscape.copperAutomatons,
    ),
    0,
  );
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.7, 0.43));
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.copperBuildings > 20,
  );
  await page.locator("#fixture").selectOption("1");
  await page.waitForTimeout(650);
  await page
    .locator("#stage")
    .screenshot({ path: output + "/copper-islands.png" });
  await page.goto(base + "sandbox/?theme=copper");
  await page.waitForFunction(
    () =>
      window.TerrainWildlife?.layer.getStats().landscape.copperBuildings > 0,
  );
  await page.locator("#labels").uncheck();
  await page.waitForTimeout(900);
  await page
    .locator(".stage-card")
    .screenshot({ path: output + "/copper-sandbox.png" });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        output,
        buildings: metrics.landscape.copperBuildings,
        automatons: metrics.landscape.copperAutomatons,
        steamVents: metrics.landscape.copperSteamVents,
        ruins: metrics.landscape.copperRuins,
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
