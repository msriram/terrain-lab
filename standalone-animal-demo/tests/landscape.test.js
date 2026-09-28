import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLandscape } from "../src/environment/layout.js";
import { LANDSCAPES } from "../src/catalog/landscapes.js";
import { clusteredReefSites } from "../src/environment/reef-layout.js";
test("landscapes place props in valid habitats and trace shorelines", () => {
  const a = analyzeLandscape((u) => u, 0.43);
  assert.ok(a.land.length > 0 && a.sea.length > 0 && a.shore.length > 0);
  assert.ok(a.land.every((p) => p.h > 0.485));
  assert.ok(a.sea.every((p) => p.h < 0.385));
  assert.ok(
    a.shore.every(
      (s) => Math.abs(s.a.u - 0.43) < 1e-8 && Number.isFinite(s.nx),
    ),
  );
  assert.deepEqual(
    a,
    analyzeLandscape((u) => u, 0.43),
  );
});
test("only sufficiently high prominent mountains trigger eruptions", () => {
  const mountain = (u, v) =>
    0.2 + 0.75 * Math.exp(-((u - 0.5) ** 2 + (v - 0.5) ** 2) / 0.012);
  assert.equal(analyzeLandscape(() => 0.9, 0.43).volcanoes.length, 0);
  assert.equal(analyzeLandscape(() => 0.2, 0.43).volcanoes.length, 0);
  assert.equal(analyzeLandscape(mountain, 0.43).volcanoes.length, 1);
  assert.equal(analyzeLandscape(() => NaN, 0.43).land.length, 0);
});
test("underwater recipes populate the whole seafloor without surface shores", () => {
  const a = analyzeLandscape(() => 0.8, 1, { underwater: true });
  assert.equal(a.sea.length, 28);
  assert.equal(a.shore.length, 0);
  assert.equal(Object.keys(LANDSCAPES).length, 26);
  for (const kind of ["chest", "trident", "ruin", "castle", "drownedtower", "brokenarch"])
    assert.ok(LANDSCAPES.atlantis.props.includes(kind));
});

test("Atlantis fields a lost kingdom and swimming merpeople", async () => {
  const { AQUATIC_ROSTER } = await import("../src/catalog/landscapes.js");
  const { SPECIES } = await import("../src/catalog/species.js");
  for (const kind of ["castle", "drownedtower", "brokenarch", "ruin"])
    assert.ok(LANDSCAPES.atlantis.props.includes(kind));
  assert.equal(AQUATIC_ROSTER.filter((id) => id === "mermaid").length, 3);
  assert.equal(AQUATIC_ROSTER.filter((id) => id === "merman").length, 2);
  assert.ok(["mermaid", "merman"].every((id) => SPECIES[id].habitat === "water"));
});

test("new world rosters use original animated species and majority prey", async () => {
  const { WORLD_ROSTERS } = await import("../src/catalog/landscapes.js");
  const { SPECIES } = await import("../src/catalog/species.js");
  for (const [world, roster] of Object.entries(WORLD_ROSTERS)) {
    if (!roster) continue;
    assert.equal(roster.length, 8, world);
    assert.ok(
      roster.every((id) => SPECIES[id]),
      world,
    );
    assert.ok(
      roster.filter((id) => SPECIES[id].prey.length === 0).length >= 5,
      world,
    );
  }
});

test("each signature creature appears in its own world", async () => {
  const { WORLD_FAUNA } = await import("../src/catalog/world-fauna.js");
  const { WORLD_ROSTERS } = await import("../src/catalog/landscapes.js");
  for (const [id, animal] of Object.entries(WORLD_FAUNA))
    assert.ok(
      WORLD_ROSTERS[animal.world].includes(id),
      `${id} missing from ${animal.world}`,
    );
  for (const [world, roster] of Object.entries(WORLD_ROSTERS))
    if (world !== "earth" && world !== "forest")
      assert.ok(
        !roster?.includes("deer") && !roster?.includes("rabbit"),
        world,
      );
});

test("Tundra has distinct local wildlife and height-based scenery", async () => {
  const { WORLD_ROSTERS, LANDSCAPES } = await import("../src/catalog/landscapes.js");
  const roster = WORLD_ROSTERS.tundra;
  for (const id of ["brownbear", "dallsheep", "moose"])
    assert.ok(roster.includes(id), `${id} missing from Tundra`);
  assert.deepEqual(LANDSCAPES.tundra.props, ["meadow", "coniferstand", "rockpeak"]);
  assert.equal(roster.length, 8);
});

test("Synthwave centers springing monsters and surreal creatures", async () => {
  const { WORLD_ROSTERS } = await import("../src/catalog/landscapes.js");
  const { SPECIES } = await import("../src/catalog/species.js");
  const roster = WORLD_ROSTERS.synthwave;
  for (const id of ["neonbehemoth", "glitchimp", "velvetphantom"])
    assert.ok(roster.includes(id));
  assert.ok(roster.filter((id) => SPECIES[id].locomotion === "bounce").length >= 7);
  for (const id of ["neonbehemoth", "glitchimp", "velvetphantom"]) {
    assert.equal(SPECIES[id].actions.move, "Jump");
    assert.ok(SPECIES[id].speed < 0.01);
  }
});

test("coral colonies form twenty-five small irregular clusters on raised sand", () => {
  const land = Array.from({ length: 8 }, (_, i) => ({
    u: .18 + (i % 4) * .2, v: .2 + Math.floor(i / 4) * .4, h: .55 + i * .03,
  }));
  const sites = clusteredReefSites(land, 17);
  assert.equal(sites.length, 25);
  assert.deepEqual(sites, clusteredReefSites(land, 17));
  assert.deepEqual(clusteredReefSites([], 17), []);
  for (let cluster = 0; cluster < 5; cluster++) {
    const group = sites.filter((p) => p.cluster === cluster);
    assert.equal(group.length, 5);
    assert.ok(group.every((p) => Math.hypot(p.u - group[0].u, p.v - group[0].v) < .085));
  }
});
