import { chromium } from "playwright";
import assert from "node:assert/strict";
import { LANDSCAPES, WORLD_SIGNATURES } from "../src/catalog/landscapes.js";
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.DEMO_URL || "http://127.0.0.1:5174/");
  await page.waitForFunction(() => window.animalDemo);
  for (const theme of Object.keys(LANDSCAPES)) {
    await page.locator("#landscape").selectOption(theme);
    await page.waitForFunction(
      (t) =>
        animalDemo.getMetrics().landscape.theme === t &&
        animalDemo.getMetrics().landscape.props > 0,
      theme,
    );
    const species = await page.evaluate(() =>
      animalDemo.layer.simulation.creatures.map((c) => c.species),
    );
    if (WORLD_SIGNATURES[theme])
      assert.ok(
        species.includes(WORLD_SIGNATURES[theme]),
        `${theme} lacks its signature animal`,
      );
    if (theme === "atlantis") {
      const stats = await page.evaluate(() => animalDemo.getMetrics());
      assert.equal(stats.active, 8);
      for (const kind of ["chest", "trident", "ruin", "knoll"])
        assert.ok(stats.landscape.propKinds.includes(kind));
      await page
        .locator("#stage")
        .screenshot({ path: "../website/images/atlantis.png" });
    }
  }
  await page.locator("#landscape").selectOption("universe");
  await page.locator("#fixture").selectOption("3");
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.galaxies >= 2,
  );
  assert.ok(
    (await page.evaluate(
      () => animalDemo.getMetrics().landscape.scatteredStars,
    )) > 0,
  );
  await page.locator("#landscape").selectOption("microscopic");
  assert.deepEqual(
    await page.evaluate(() =>
      animalDemo.layer.simulation.creatures.map((c) => c.species).slice(0, 2),
    ),
    ["phage", "microbe"],
  );
  await page.locator("#landscape").selectOption("neuron");
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.signalLinks > 0,
  );
  await page.locator("#landscape").selectOption("atomic");
  await page.waitForFunction(() =>
    animalDemo.getMetrics().landscape.propKinds.includes("atom"),
  );
  await page.locator("#landscape").selectOption("volcanic");
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.2, 0.43));
  await page.waitForFunction(() => !animalDemo.getMetrics().landscape.erupting);
  await page.locator("#fixture").selectOption("4");
  await page.waitForFunction(() => animalDemo.getMetrics().landscape.erupting);
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.lavaCells > 20,
  );
  await page.waitForTimeout(8000);
  await page
    .locator("#stage")
    .screenshot({ path: "screenshots/volcano-flow.png" });
  await page.evaluate(() => animalDemo.layer.setTerrain(() => 0.2, 0.43));
  await page.waitForFunction(() => !animalDemo.getMetrics().landscape.erupting);
  await page.locator("#landscape").selectOption("earth");
  await page.waitForFunction(
    () => animalDemo.getMetrics().landscape.flockCount === 32,
  );
  await page.locator("#fixture").selectOption("1");
  await page.locator("#fixture").selectOption("0");
  await page.waitForTimeout(500);
  await page.locator("#scenery").uncheck();
  const frozen = await page.evaluate(
    () => animalDemo.getMetrics().landscape.time,
  );
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => animalDemo.getMetrics().landscape.time),
    frozen,
  );
  await page.locator("#scenery").check();
  await page.waitForTimeout(500);
  assert.ok(
    (await page.evaluate(() => animalDemo.getMetrics().landscape.time)) >
      frozen,
  );
  await page
    .locator("#stage")
    .screenshot({ path: "../website/images/landscape.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 26 themes with signature fauna, underwater props, eruption onset/removal, weather pause, no browser errors",
  );
} finally {
  await browser.close();
}
