import test from "node:test";
import assert from "node:assert/strict";
import {
  randomRoster,
  SPECIES,
  DEFAULT_ROSTER,
} from "../src/catalog/species.js";
import { AnimalSimulation } from "../src/simulation/world.js";
import { createTerrain } from "../src/terrain/fixtures.js";
import { readFileSync } from "node:fs";

test("eight animals stay inside habitat footprints through terrain and water changes", () => {
  const sim = new AnimalSimulation({
    sampleTerrain: createTerrain(),
    seed: 7,
    roster: ["rabbit", "deer", "rabbit", "koi", "koi", "koi", "koi", "koi"],
  });
  for (const fixture of [0, 1, 2])
    for (const water of [0.3, 0.43, 0.6]) {
      sim.setTerrain(createTerrain(fixture), water);
      assert.ok(
        sim.creatures.filter((c) => c.active).length >= 7,
        `fixture ${fixture}, water ${water}`,
      );
      if (water === 0.43)
        assert.equal(sim.creatures.filter((c) => c.active).length, 8);
      for (let frame = 0; frame < 1800; frame++) {
        sim.update(1 / 60);
        for (const c of sim.creatures)
          assert.ok(
            !c.active || sim.valid(c, c.u, c.v),
            `${c.id} stranded at ${c.u},${c.v}`,
          );
      }
    }
});
test("missing habitat hides residents and restoring terrain recovers them", () => {
  const sim = new AnimalSimulation({
    sampleTerrain: () => 0,
    seed: 7,
    roster: DEFAULT_ROSTER,
  });
  assert.equal(sim.creatures.filter((c) => c.active).length, 5);
  sim.setTerrain(() => 1);
  assert.equal(sim.creatures.filter((c) => c.active).length, 3);
  sim.setTerrain(createTerrain());
  assert.equal(sim.creatures.filter((c) => c.active).length, 8);
  sim.setTerrain(() => NaN);
  assert.equal(sim.creatures.filter((c) => c.active).length, 0);
});
test("creatures travel and turn smoothly without crossing a narrow channel", () => {
  const sim = new AnimalSimulation({
    sampleTerrain: createTerrain(),
    seed: 7,
    roster: ["rabbit", "deer", "rabbit", "koi", "koi", "koi", "koi", "koi"],
  });
  const distance = Array(8).fill(0);
  for (let frame = 0; frame < 3600; frame++) {
    const before = sim.creatures.map((c) => ({ ...c }));
    sim.update(1 / 60);
    sim.creatures.forEach((c, i) => {
      distance[i] += Math.hypot(c.u - before[i].u, c.v - before[i].v);
      assert.ok(Math.abs(c.heading - before[i].heading) < 0.06);
    });
  }
  distance.forEach((d, i) =>
    assert.ok(d > 0.12, `animal ${i} traveled only ${d}`),
  );
});
test("all eleven GLBs bundle animations and have no external asset references", () => {
  for (const name of [
    "fox/model.glb",
    "koi/model.glb",
    "deer/model.glb",
    "wolf/model.glb",
    "rabbit/model.glb",
    "shark/model.glb",
    "starseed/model.glb",
    "voidray/model.glb",
    "microbe/model.glb",
    "phage/model.glb",
    "drone/model.glb",
  ]) {
    const b = readFileSync(
      new URL(`../public/assets/animals/${name}`, import.meta.url),
    );
    assert.equal(b.toString("utf8", 0, 4), "glTF");
    const json = JSON.parse(b.toString("utf8", 20, 20 + b.readUInt32LE(12)));
    assert.ok(json.animations?.length > 0);
    assert.ok(json.meshes.length > 0);
    for (const item of [...json.buffers, ...(json.images || [])])
      assert.ok(!item.uri || item.uri.startsWith("data:"));
  }
});

test("each predator chases nearby prey, which flees; distant prey is ignored", () => {
  for (const [predator, prey, water] of [
    ["fox", "rabbit", false],
    ["wolf", "deer", false],
    ["shark", "koi", true],
  ]) {
    const sim = new AnimalSimulation({
      sampleTerrain: () => (water ? 0 : 1),
      roster: [predator, prey],
    });
    Object.assign(sim.creatures[0], { u: 0.4, v: 0.5, protection: 0 });
    Object.assign(sim.creatures[1], {
      u: 0.56,
      v: 0.5,
      protection: 0,
      mode: "nibble",
    });
    sim.update(1 / 60);
    assert.equal(sim.creatures[0].mode, "chase");
    assert.equal(sim.creatures[1].mode, "flee");
    assert.equal(sim.creatures[1].speedMultiplier, 2);
    assert.equal(sim.events[0].predator, predator);
    assert.equal(sim.events[0].prey, prey);
    Object.assign(sim.creatures[1], { u: 0.9, v: 0.9 });
    sim.update(1 / 60);
    assert.notEqual(sim.creatures[0].mode, "chase");
  }
});
test("fish breaches are time-bounded, and stir creates an active gesture", () => {
  const sim = new AnimalSimulation({ sampleTerrain: () => 0, roster: ["koi"] });
  sim.stir();
  assert.equal(sim.creatures[0].mode, "breach");
  for (let i = 0; i < 100; i++) sim.update(1 / 60);
  assert.notEqual(sim.creatures[0].mode, "breach");
  assert.ok(
    sim.valid(sim.creatures[0], sim.creatures[0].u, sim.creatures[0].v),
  );
});
test("roster supports eight of any species, safe empty state, and rejects unknown IDs", () => {
  const sim = new AnimalSimulation({ sampleTerrain: () => 1 });
  sim.setRoster(Array(8).fill("wolf"));
  assert.equal(sim.creatures.filter((c) => c.active).length, 8);
  assert.throws(() => sim.setRoster(["dragon"]));
  assert.throws(() => sim.setRoster(Array(9).fill("wolf")));
  sim.setRoster([]);
  sim.update(0.1);
  assert.equal(sim.creatures.length, 0);
});

test("capture removes prey, terrain updates cannot revive it early, then repopulates safely", () => {
  const sim = new AnimalSimulation({
    sampleTerrain: () => 1,
    roster: ["fox", "rabbit"],
    seed: 7,
  });
  Object.assign(sim.creatures[0], {
    u: 0.4,
    v: 0.5,
    protection: 0,
    mode: "chase",
    target: 1,
  });
  Object.assign(sim.creatures[1], { u: 0.405, v: 0.5, protection: 0 });
  sim.resolveCaptures();
  assert.equal(sim.captures, 1);
  assert.equal(sim.creatures[1].active, false);
  assert.equal(sim.creatures[1].mode, "eaten");
  sim.setTerrain(() => 1);
  assert.equal(sim.creatures[1].active, false);
  for (let i = 0; i < 340; i++) sim.update(0.05);
  assert.ok(sim.creatures[1].active);
  assert.ok(
    sim.valid(sim.creatures[1], sim.creatures[1].u, sim.creatures[1].v),
  );
});
test("drag respects habitats, freezes held animals, and protects released prey", () => {
  const sim = new AnimalSimulation({
    sampleTerrain: (u) => (u < 0.5 ? 1 : 0),
    roster: ["fox", "rabbit", "koi"],
    seed: 9,
  });
  assert.ok(sim.grab(1));
  assert.equal(sim.move(1, 0.8, 0.5), false);
  assert.ok(sim.move(1, 0.2, 0.5));
  const c = sim.creatures[1];
  sim.update(0.05);
  assert.equal(c.u, 0.2);
  assert.equal(c.v, 0.5);
  assert.ok(sim.release(1));
  assert.equal(c.protection, 3);
  assert.equal(sim.rescues, 1);
  Object.assign(sim.creatures[0], {
    u: 0.2,
    v: 0.5,
    mode: "chase",
    target: 1,
    protection: 0,
  });
  sim.resolveCaptures();
  assert.equal(c.active, true);
  c.protection = 0;
  sim.resolveCaptures();
  assert.equal(c.active, false);
  assert.ok(sim.grab(2));
  assert.equal(sim.move(2, 0.1, 0.5), false);
  assert.ok(sim.move(2, 0.8, 0.5));
});
test("random populations have six prey and two predators, varied species and positions", () => {
  const rosters = new Set(),
    positions = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const sim = new AnimalSimulation({ sampleTerrain: createTerrain(), seed });
    rosters.add(sim.creatures.map((c) => c.species).join());
    positions.add(sim.creatures.map((c) => c.u.toFixed(3)).join());
    assert.equal(
      sim.creatures.filter((c) => SPECIES[c.species].prey.length > 0).length,
      2,
    );
    assert.equal(
      sim.creatures.filter((c) => SPECIES[c.species].prey.length === 0).length,
      6,
    );
  }
  assert.ok(rosters.size > 2);
  assert.ok(positions.size > 20);
});
