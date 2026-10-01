import { createServer } from "node:http";
import { readFile, stat, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { ANALYTICS_ENDPOINT } from "../../analytics/config.js";
const root = resolve("../_site");
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://local");
    if (!url.pathname.startsWith("/terrain-lab/")) {
      res.writeHead(404).end();
      return;
    }
    let path = resolve(
      root,
      "." + decodeURIComponent(url.pathname.slice("/terrain-lab".length)),
    );
    if (path !== root && !path.startsWith(root + "/")) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(path)).isDirectory()) path += "/index.html";
    res.setHeader(
      "Content-Type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".png": "image/png",
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
const base = `http://127.0.0.1:${server.address().port}/terrain-lab/`;
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    deviceScaleFactor: 1,
  });
  const errors = [],
    missing = [],
    external = [];
  context.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("response", (r) => {
      if (r.status() >= 400) missing.push(r.url());
    });
  });
  await context.route("**/*", (route) => {
    if (ANALYTICS_ENDPOINT && route.request().url() === `${ANALYTICS_ENDPOINT}/api/event`)
      return route.fulfill({ status: 204, body: "", headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS" } });
    if (!route.request().url().startsWith(base)) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const checkedLinks = new Set();
  for (const route of ["", "guide/", "contribute/", "wildlife/", "sandbox/"]) {
    await page.goto(base + route);
    if (route === "wildlife/")
      await page.waitForFunction(() => window.animalDemo);
    if (route === "sandbox/")
      await page.waitForFunction(() => window.TerrainWildlife);
    for (const href of await page
      .locator("a[href]")
      .evaluateAll((links) => links.map((a) => a.href))) {
      if (href.startsWith(base)) checkedLinks.add(href.split("#")[0]);
    }
    if (route === "")
      await page.screenshot({
        path: "screenshots/showcase.png",
        fullPage: true,
      });
    if (route === "guide/")
      await page.screenshot({ path: "screenshots/guide.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} mobile overflow`,
    );
    if (route === "")
      await page.screenshot({
        path: "screenshots/showcase-mobile.png",
        fullPage: true,
      });
    await page.setViewportSize({ width: 1440, height: 1050 });
  }
  for (const href of checkedLinks) {
    const response = await context.request.get(href);
    assert.equal(response.status(), 200, href);
  }
  await page
    .getByRole("button", { name: "Pause motion", exact: true })
    .click();
  // Actual pointer drag from an animal to a legal spot in the host's terrain UVs.
  const candidate = await page.evaluate(() => {
    const sim = TerrainWildlife.layer.simulation,
      c = sim.creatures.find((c) => c.active && c.habitat === "land");
    for (let v = 0.15; v < 0.85; v += 0.1)
      for (let u = 0.1; u < 0.9; u += 0.1)
        if (sim.valid(c, u, v) && Math.hypot(c.u - u, c.v - v) > 0.15)
          return { id: c.id, start: { u: c.u, v: c.v }, end: { u, v } };
  });
  assert.ok(candidate);
  const box = await page.locator(".stage-card").boundingBox();
  await page.mouse.move(
    box.x + candidate.start.u * box.width,
    box.y + candidate.start.v * box.height,
  );
  await page.mouse.down();
  await page.mouse.move(
    box.x + candidate.end.u * box.width,
    box.y + candidate.end.v * box.height,
    { steps: 8 },
  );
  await page.mouse.up();
  const rescued = await page.evaluate(
    (id) => TerrainWildlife.layer.simulation.creatures[id],
    candidate.id,
  );
  assert.ok(Math.abs(rescued.u - candidate.end.u) < 0.005);
  assert.ok(rescued.protection > 2.5);
  assert.equal(rescued.held, false);
  assert.equal(
    await page.evaluate(() => TerrainWildlife.layer.simulation.rescues),
    1,
  );
  // Rotation mirrors both terrain and wildlife, and pointer UVs invert with it.
  await page.locator("#rotateProjector").check();
  await page.waitForFunction(
    () =>
      TerrainWildlife.canvas.style.transform ===
      document.querySelector("#terrain").style.transform,
  );
  assert.ok(
    (await page.locator("#terrain").getAttribute("style")).includes("180deg"),
  );
  await page.locator("#rotateProjector").uncheck();
  // A physical calibration pass must own the pointer; wildlife gets out of the way.
  await page.locator("#startCalibration").click();
  await page.waitForFunction(
    () =>
      TerrainWildlife.canvas.style.pointerEvents === "none" &&
      TerrainWildlife.layer.getStats().active === 0,
  );
  await page.locator("#cancelCalibration").click();
  await page.locator("#pointer-mode").selectOption("sculpt");
  await page.waitForFunction(
    () => TerrainWildlife.canvas.style.pointerEvents === "none",
  );
  const height = await page.evaluate(() => TerrainLab.sampleTerrain(0.2, 0.5));
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.5, {button:"right"});
  assert.ok(
    await page.evaluate((h) => TerrainLab.sampleTerrain(0.2, 0.5) > h, height),
  );
  await page.locator("#pointer-mode").selectOption("rescue");
  await page.locator("#theme").selectOption("atlantis");
  assert.equal(await page.locator('#browserModeLink').getAttribute('href'), '../wildlife/?theme=atlantis&population=8');
  await page.waitForFunction(
    () => TerrainWildlife.layer.getStats().pack === "atlantis",
  );
  await page.locator("#theme").selectOption("earth");
  await page.locator("#theme").selectOption("coral");
  await page.evaluate(() => TerrainLab.setSample((u,v) =>
    Math.hypot(u - .73, v - .48) < .14 ? .8 : .24));
  await page.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.reefColonies >= 40);
  assert.ok(await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.reefSites.every(
    site => TerrainLab.sampleTerrain(site.u, site.v) > .43)));
  for (const world of ['atlantis', 'deepsea']) {
    await page.evaluate(() => TerrainLab.setSample(() => .2));
    await page.locator('#theme').selectOption(world);
    await page.waitForFunction(w => TerrainWildlife.layer.getStats().landscape.theme === w, world);
    await page.waitForFunction(() => !TerrainWildlife.layer.getStats().landscape.propKinds.some(
      kind => ['castle', 'drownedtower', 'talokan-temple', 'talokan-district'].includes(kind)));
    await page.evaluate(() => TerrainLab.setSample((u, v) =>
      .2 + .58 * Math.exp(-(((u - .7) / .12) ** 2 + ((v - .45) / .12) ** 2))));
    await page.waitForFunction(w => TerrainWildlife.layer.getStats().landscape.propKinds.includes(
      w === 'atlantis' ? 'castle' : 'talokan-temple'), world);
    if (world === 'deepsea') {
      const established = await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.structureSites);
      const rebuilds = await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.sceneryRebuilds);
      await page.evaluate(() => TerrainLab.setSample((u, v) => .2 +
        .58 * Math.exp(-(((u - .7) / .12) ** 2 + ((v - .45) / .12) ** 2)) +
        .42 * Math.exp(-(((u - .24) / .11) ** 2 + ((v - .72) / .11) ** 2))));
      await page.waitForTimeout(950);
      assert.equal(await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.sceneryRebuilds), rebuilds,
        'Talokan scenery should wait before reacting to another terrain edit');
      await page.waitForFunction(n => TerrainWildlife.layer.getStats().landscape.sceneryRebuilds > n,
        rebuilds, { timeout: 15000 });
      const after = await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.structureSites);
      assert.ok(established.every(site => after.some(next => next.kind === site.kind &&
        Math.hypot(next.u - site.u, next.v - site.v) < .001)),
      'existing Talokan structures should remain anchored when another hill grows');
    }
  }
  await page.evaluate(() => TerrainLab.setSample(() => .72));
  await page.locator('#theme').selectOption('copper');
  await page.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.copperStations >= 10);
  for (const world of ['copper', 'cyberpunk', 'emerald']) {
    if (world !== 'copper') await page.locator('#theme').selectOption(world);
    if (world === 'cyberpunk')
      await page.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.roadSegments > 0);
    if (world === 'emerald') {
      await page.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.emeraldCitadels >= 5);
      await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
      await page.waitForFunction(() => TerrainWildlife.layer.simulation.creatures.some(c => c.species === 'jadebird' && c.mode === 'flee') ||
        TerrainWildlife.layer.simulation.events.some(e => e.predator === 'Witch'), null, { timeout: 15000 });
      await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    }
    const builds = await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.cityRebuilds);
    await page.evaluate(() => TerrainLab.setSample((u, v) => .72 + .012 * Math.sin(u * 371 + v * 257)));
    await page.waitForTimeout(950);
    assert.equal(await page.evaluate(() => TerrainWildlife.layer.getStats().landscape.cityRebuilds), builds,
      `${world} roads should not rebuild from small depth noise`);
  }
  await page.evaluate(() => TerrainLab.setSample(() => .2));
  await page.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.emeraldCitadels === 0);
  await page.evaluate(() => TerrainLab.setSample((u,v) => Math.hypot(u - .73, v - .48) < .14 ? .8 : .24));
  await page.locator("#theme").selectOption("earth");
  // Projector consumes controller state, including edited terrain, instead of spawning its own world.
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#projector").click();
  const projector = await popupPromise;
  await projector.waitForFunction(() => window.TerrainWildlife);
  await projector.waitForFunction(
    () => TerrainWildlife.layer.simulation.rescues === 1,
  );
  const source = await page.evaluate(() => TerrainWildlife.layer.getSnapshot());
  const projected = await projector.evaluate(() =>
    TerrainWildlife.layer.getSnapshot(),
  );
  await page.locator("#landscape-density").fill("200");
  await projector.waitForFunction(() => TerrainWildlife.layer.getStats().landscape.density === 2);
  await page.locator("#landscape-density").fill("100");
  await page.locator("#randomize-landscape").click();
  await projector.waitForFunction(seed => TerrainWildlife.layer.getSnapshot().landscape.seed === seed,
    await page.evaluate(() => TerrainWildlife.layer.getSnapshot().landscape.seed));
  await page.locator("#scenery").uncheck();
  await projector.waitForFunction(() => !document.querySelector("#scenery").checked);
  await page.locator("#scenery").check();
  await projector.waitForFunction(() => document.querySelector("#scenery").checked);
  assert.equal(projected.creatures.length, source.creatures.length);
  assert.ok(
    Math.abs(
      projected.creatures[candidate.id].u - source.creatures[candidate.id].u,
    ) < 0.005,
  );
  assert.equal(
    await projector.evaluate(() => TerrainLab.sampleTerrain(0.2, 0.5)),
    await page.evaluate(() => TerrainLab.sampleTerrain(0.2, 0.5)),
  );
  await projector.close();
  await page.bringToFront();
  await page
    .getByRole("button", { name: "Resume motion", exact: true })
    .click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "screenshots/sandbox.png", fullPage: true });
  await page
    .locator(".stage-card")
    .screenshot({ path: "../website/images/sandbox.png" });
  // Atmosphere keeps its apparent direction when the projector canvas turns.
  await page.locator("#rotateProjector").check();
  await page.waitForFunction(() => {
    const a=TerrainWildlife.layer.getStats().landscape;
    return a.projectionFlipped && Math.abs(a.cloudRotation-Math.PI)<.001 && Math.abs(a.flockRotation-Math.PI)<.001;
  });
  await page.locator("#theme").selectOption("cyberpunk");
  await page.waitForFunction(() => {
    const a=TerrainWildlife.layer.getStats().landscape;
    return a.rainStreaks===900 && Math.abs(a.rainRotation-Math.PI)<.001;
  });
  await page.locator("#rotateProjector").uncheck();
  await page.waitForFunction(() => {
    const a=TerrainWildlife.layer.getStats().landscape;
    return !a.projectionFlipped && Math.abs(a.rainRotation)<.001;
  });
  // Public wildlife demo uses the same drag implementation.
  await page.goto(base + "wildlife/");
  await page.waitForFunction(() => window.animalDemo);
  assert.match(await page.title(), /Browser Mode/);
  assert.match(await page.locator('#live-mode-link').getAttribute('href'), /^\.\.\/sandbox\/\?theme=earth&population=\d+$/);
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForFunction(() => !document.body.classList.contains('projection'));
  const defaultProps = await page.evaluate(() => animalDemo.getMetrics().landscape.props);
  await page.locator("#landscape-density").fill("0");
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.props === 0);
  await page.locator("#landscape-density").fill("300");
  await page.waitForFunction(n => animalDemo.getMetrics().landscape.props > n, defaultProps);
  await page.locator("#landscape-density").fill("100");
  assert.equal(await page.locator("#atmosphere").count(), 0);
  await page.getByLabel("Landscape & weather").uncheck();
  const stoppedTime = await page.evaluate(() => animalDemo.getMetrics().landscape.time);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => animalDemo.getMetrics().landscape.time), stoppedTime);
  await page.getByLabel("Landscape & weather").check();
  await page.waitForFunction((time) => animalDemo.getMetrics().landscape.time > time, stoppedTime);
  await page.locator("#landscape").selectOption("tundra");
  assert.match(await page.locator('#live-mode-link').getAttribute('href'), /^\.\.\/sandbox\/\?theme=tundra&population=\d+$/);
  await page.locator("#landscape").selectOption("cyberpunk");
  await page.waitForFunction(() => animalDemo.layer.simulation.creatures.every(c =>
    ["patrolDrone","thiefDrone","policeBoat","thiefBoat"].includes(c.species)));
  assert.equal(await page.locator('#preset option[value="prismwing"]').count(),0);
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.helipads > 0 &&
    animalDemo.getMetrics().landscape.zipLines > 0 && animalDemo.getMetrics().landscape.pedestrians > 0);
  await page.waitForTimeout(1500);
  const traffic=await page.evaluate(()=>animalDemo.getMetrics().landscape);
  assert.equal(traffic.cars,traffic.roadSegments*2);
  assert.equal(traffic.rainStreaks,900);
  await page.locator("#stage").screenshot({path:"screenshots/cyber-city.png"});
  await page.evaluate(() => animalDemo.layer.setTerrain(()=>.15,.43));
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.towers === 0 &&
    animalDemo.getMetrics().landscape.pedestrians === 0 && animalDemo.getMetrics().landscape.helicopters === 0);
  await page.evaluate(() => animalDemo.layer.setTerrain(u=>u>.46&&u<.54?.2:.65,.43));
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.bridges > 0);
  await page.evaluate(() => animalDemo.layer.setTerrain(()=>.65,.43));
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.bridges === 0);
  await page.evaluate(() => animalDemo.layer.setTerrain(()=>NaN,.43));
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.cityBlocks === 0);
  await page.locator("#landscape").selectOption("tundra");
  await page.locator("#fixture").selectOption("4");
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.depositCoverage > .005);
  await page.waitForTimeout(5000);
  await page.locator("#stage").screenshot({ path: "screenshots/tundra-snow.png" });
  await page.evaluate(() => animalDemo.layer.setTerrain(() => NaN, .43));
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.depositCoverage === 0);
  await page.reload();
  await page.waitForFunction(() => window.animalDemo);
  await page.locator('#pointer-mode').selectOption('move');
  await page.locator("#pause").click();
  const c = await page.evaluate(() =>
    animalDemo.layer.simulation.creatures.find((c) => c.active),
  );
  await page.locator("#stage").scrollIntoViewIfNeeded();
  const rect = await page.locator("#stage").boundingBox();
  await page.mouse.move(rect.x + c.u * rect.width, rect.y + c.v * rect.height);
  await page.mouse.down();
  await page.mouse.up();
  assert.equal(
    await page.evaluate(() => animalDemo.layer.simulation.rescues),
    1,
  );
  const first = await page.evaluate(() =>
    animalDemo.layer.simulation.creatures.map((c) => [c.species, c.u, c.v]),
  );
  await page.locator("#animal-count").evaluate(el => {
    el.value = "16";
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => animalDemo.layer.simulation.creatures.length), 16);
  assert.equal(await page.locator("#animal-count-value").inputValue(), "16");
  assert.match(await page.locator('#live-mode-link').getAttribute('href'), /population=16$/);
  assert.equal(await page.locator("#shuffle, #stir").count(), 0);
  await page.locator("#landscape").selectOption("atlantis");
  assert.equal(await page.locator('#preset option[value="rabbit"]').count(), 0);
  await page.locator("#pointer-mode").selectOption("elements");
  const beforeProps = await page.evaluate(() => animalDemo.getMetrics().landscape.props);
  await page.locator("#stage").click({position:{x:300,y:300}});
  await page.waitForFunction(n => animalDemo.getMetrics().landscape.props === n + 1, beforeProps);
  await page.locator("#stage").click({position:{x:300,y:300},button:"right"});
  await page.waitForFunction(n => animalDemo.getMetrics().landscape.props === n, beforeProps);
  assert.notDeepEqual(
    await page.evaluate(() =>
      animalDemo.layer.simulation.creatures.map((c) => [c.species, c.u, c.v]),
    ),
    first,
  );
  await page.goto(new URL(await page.locator('#live-mode-link').getAttribute('href'), page.url()).href);
  await page.waitForFunction(() => window.TerrainWildlife?.layer);
  assert.equal(await page.locator('#animal-count').inputValue(), '16');
  assert.equal(await page.locator('#animal-count-value').inputValue(), '16');
  assert.equal(await page.evaluate(() => TerrainWildlife.layer.simulation.creatures.length), 16);
  await page.locator('#animal-count').evaluate(el => {
    el.value = '12';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await page.evaluate(() => TerrainWildlife.layer.simulation.creatures.length), 12);
  await page.goto(new URL(await page.locator('#browserModeLink').getAttribute('href'), page.url()).href);
  await page.waitForFunction(() => window.animalDemo);
  assert.equal(await page.locator('#animal-count').inputValue(), '12');
  assert.equal(await page.evaluate(() => animalDemo.layer.simulation.creatures.length), 12);
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  assert.deepEqual(external, []);
  const report = {
    testedAt: new Date().toISOString(),
    checks: [
      "GitHub Pages subpath routing",
      "all internal links return 200",
      "desktop and mobile layouts",
      "mode switching preserves the selected world",
      "population slider remains in sync across modes",
      "browser fullscreen enters and exits cleanly",
      "integrated wildlife loading",
      "drag rescue in both demos",
      "3-second protection",
      "terrain editing",
      "raised sand grows small reefs; Talokan structures stay anchored through terrain edits",
      "calibration pointer ownership",
      "rotation alignment",
      "rain, clouds, and flock retain screen direction after 180° projector rotation",
      "projector state and terrain synchronization",
      "random population",
      "city roads resist depth noise and respond to live terrain changes",
      "Emerald witches chase Jade birds and trigger fleeing",
    ],
    errors,
    missing,
    external,
  };
  await writeFile(
    "screenshots/site-verification.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server.close();
}
