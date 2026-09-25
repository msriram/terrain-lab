import test from "node:test";
import assert from "node:assert/strict";
import { analyzeLandscape } from "../src/environment/layout.js";
import { LANDSCAPES } from "../src/catalog/landscapes.js";
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
  for (const kind of ["chest", "trident", "ruin", "knoll"])
    assert.ok(LANDSCAPES.atlantis.props.includes(kind));
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
