// Tests the portable artifact as a native ES module, without Vite or demo code.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const root = resolve("dist-layer");
const html = `<!doctype html><style>body{margin:0}canvas{width:1024px;height:768px}</style><canvas id="animals"></canvas><script type="module">
import {createAnimalLayer} from '/animal-layer.js';
const layer = await createAnimalLayer({canvas:document.querySelector('canvas'),sampleTerrain:()=>.8,roster:Array(8).fill('deer'),assetBase:'/assets/animals/'});
layer.resize(1024,768);window.layer=layer;
let last=performance.now();const times=[];
function frame(now){times.push(now-last);layer.update((now-last)/1000);last=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.times=times;
</script>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      return;
    }
    const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
    if (!path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".glb": "model/gltf-binary",
        ".json": "application/json",
      }[extname(path)] || "text/plain",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort(),
  );
  await page.goto(base);
  await page.waitForFunction(() => window.layer && times.length >= 360);
  const result = await page.evaluate(() => {
    const samples = times.slice(-300);
    return {
      ...layer.getStats(),
      frames: samples.length,
      averageFPS: 1000 / (samples.reduce((a, b) => a + b) / samples.length),
    };
  });
  assert.equal(result.active, 8);
  assert.ok(result.drawCalls > 0);
  assert.deepEqual(errors, []);
  // Exercise the public toggle/roster/disposal lifecycle after a large population.
  await page.evaluate(() => {
    layer.setRoster(["fox", "rabbit", "wolf"]);
    layer.update(0);
  });
  assert.equal(await page.evaluate(() => layer.getStats().active), 3);
  await page.evaluate(() => {
    layer.setRoster([]);
    layer.update(0);
  });
  assert.equal(await page.evaluate(() => layer.getStats().drawCalls), 0);
  await page.evaluate(() => layer.dispose());
  await writeFile(
    "screenshots/integration-verification.json",
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        mode: "Portable ES module on plain HTTP server; eight animated deer",
        result,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  server.close();
}
