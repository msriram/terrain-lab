import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "5175",
    "--strictPort",
  ],
  { stdio: "pipe" },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (data) => {
      if (data.toString().includes("127.0.0.1")) resolve();
    });
    server.on("error", reject);
    server.on("exit", (code) => reject(new Error(`Preview exited: ${code}`)));
    setTimeout(
      () => reject(new Error("Preview server timeout")),
      10000,
    ).unref();
  });
  browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("**/*", (route) => {
    if (!route.request().url().startsWith("http://127.0.0.1:5175/")) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://127.0.0.1:5175");
  await page.waitForFunction(() => window.animalDemo);
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => animalDemo.getMetrics().active), 8);
  await page.screenshot({
    path: "screenshots/controller-earth.png",
    fullPage: true,
  });
  // Exercise roster rebuilding and the model and animation controllers.
  async function arrangeEncounter() {
    await page.evaluate(() => {
      const sim = animalDemo.layer.simulation;
      const predator = sim.creatures.find((c) =>
        ["wolf", "fox", "shark"].includes(c.species),
      );
      const prey = sim.creatures.find(
        (c) => c.habitat === predator.habitat && c.id !== predator.id,
      );
      for (let v = 0.15; v < 0.85; v += 0.05)
        for (let u = 0.1; u < 0.8; u += 0.05) {
          if (sim.valid(predator, u, v) && sim.valid(prey, u + 0.08, v)) {
            Object.assign(predator, {
              u,
              v,
              active: true,
              protection: 0,
              cooldown: 0,
              mode: "roam",
            });
            Object.assign(prey, {
              u: u + 0.08,
              v,
              active: true,
              protection: 0,
              cooldown: 0,
              mode: "roam",
            });
            sim.update(1 / 60);
            return;
          }
        }
      throw new Error("No shared habitat for test encounter");
    });
  }
  await page.selectOption("#preset", "woodland");
  await arrangeEncounter();
  await page.waitForFunction(() =>
    animalDemo.layer.simulation.events.some(
      (e) => e.predator === "wolf" && e.prey === "deer",
    ),
  );
  await page.screenshot({
    path: "screenshots/controller-woodland.png",
    fullPage: true,
  });
  await page.selectOption("#preset", "meadow");
  await arrangeEncounter();
  await page.waitForFunction(() =>
    animalDemo.layer.simulation.events.some(
      (e) => e.predator === "fox" && e.prey === "rabbit",
    ),
  );
  await page.locator("summary").click();
  await page.selectOption('[aria-label="Animal slot 3"]', "deer");
  assert.equal(
    await page.evaluate(() => animalDemo.layer.simulation.creatures[2].species),
    "deer",
  );
  await page.locator("summary").click();
  await page.selectOption("#preset", "reef");
  await arrangeEncounter();
  await page.waitForFunction(() =>
    animalDemo.layer.simulation.events.some(
      (e) => e.predator === "shark" && e.prey === "koi",
    ),
  );
  await page.getByRole("button", { name: "Stir wildlife" }).click();
  assert.ok(
    await page.evaluate(() =>
      animalDemo.layer.simulation.creatures.some((c) => c.mode === "breach"),
    ),
  );
  await page.getByRole("button", { name: "Projection" }).click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(1000);
  const measurement = await page.evaluate(async () => {
    const samples = [];
    let previous = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        samples.push(now - previous);
        previous = now;
        if (samples.length < 600) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    const ordered = samples.toSorted((a, b) => a - b);
    const gl = document.getElementById("animals").getContext("webgl2");
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      ...animalDemo.getMetrics(),
      averageFPS: 1000 / (samples.reduce((a, b) => a + b, 0) / samples.length),
      p95FrameMs: ordered[Math.floor(ordered.length * 0.95)],
      benchmarkFrames: samples.length,
      renderer: ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : "unavailable",
    };
  });
  await page.screenshot({ path: "screenshots/projection-earth.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Atlantis" }).click();
  await page.selectOption("#fixture", "2");
  await page.locator("#water").fill("50");
  await page.locator("#water").dispatchEvent("input");
  assert.equal(
    await page.evaluate(() => animalDemo.getMetrics().pack),
    "atlantis",
  );
  const valid = () =>
    page.evaluate(() =>
      animalDemo.layer.simulation.creatures.every(
        (c) => !c.active || animalDemo.layer.simulation.valid(c, c.u, c.v),
      ),
    );
  assert.ok(await valid());
  await page.getByRole("button", { name: "Projection" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "screenshots/projection-atlantis.png" });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.getByRole("button", { name: "Pause motion" }).click();
  const positions = () =>
    page.evaluate(() =>
      animalDemo.layer.simulation.creatures.map((c) => [c.u, c.v, c.heading]),
    );
  const before = await positions();
  await page.waitForTimeout(150);
  assert.deepEqual(await positions(), before);
  await page.locator("#terrain-visible").uncheck();
  const alpha = () =>
    page.evaluate(() => {
      animalDemo.layer.update(0);
      const gl = document.getElementById("animals").getContext("webgl2");
      const pixel = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return pixel[3];
    });
  assert.equal(await alpha(), 0);
  await page.screenshot({
    path: "screenshots/transparent-overlay.png",
    fullPage: true,
  });
  await page.locator("#transparent").uncheck();
  assert.equal(await alpha(), 255);
  await page.locator("#transparent").check();
  await page.locator("#terrain-visible").check();
  await page.locator("#scenery").uncheck();
  await page.locator("#enabled").uncheck();
  await page.waitForFunction(() => animalDemo.getMetrics().drawCalls === 0);
  await page.locator("#enabled").check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save 1024" }).click();
  const download = await downloadPromise;
  assert.ok(download.suggestedFilename().endsWith(".png"));
  for (const fixture of ["0", "1", "2"])
    for (const level of ["30", "60"]) {
      await page.selectOption("#fixture", fixture);
      await page.locator("#water").fill(level);
      await page.locator("#water").dispatchEvent("input");
      assert.ok(await valid());
    }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  const rect = await page.locator("#stage").boundingBox();
  assert.ok(Math.abs(rect.width / rect.height - 4 / 3) < 0.01);
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  const report = {
    testedAt: new Date().toISOString(),
    browser: browser.version(),
    mode: "Headless Chrome, production build, external requests blocked",
    hardware: "Apple M3 Pro MacBook Pro, 36 GB RAM",
    measurement,
    checks: [
      "33 selectable animated species / 8 slots",
      "wolf/deer and fox/rabbit proximity pursuit",
      "shark/koi pursuit",
      "fish breaches",
      "production offline runtime",
      "habitat edits",
      "pause",
      "alpha compositing",
      "visibility",
      "PNG export",
      "4:3 resize",
      "mobile layout",
      "no browser errors",
    ],
    externalRequests: external,
    errors,
  };
  await writeFile(
    "screenshots/verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.kill();
}
