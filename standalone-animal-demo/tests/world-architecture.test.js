import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planCopperWorks,
  planEmeraldCity,
} from "../src/environment/world-architecture-layout.js";

test("Copper works and Emerald City grow only on dry terrain and recede below water", () => {
  const land = (u, v) => 0.69 + 0.08 * Math.sin(u * 8) * Math.cos(v * 7);
  const copper = planCopperWorks(land, 0.43, 31);
  const emerald = planEmeraldCity(land, 0.43, 31);
  assert.ok(copper.stations.length >= 5);
  assert.ok(emerald.citadels.length >= 5);
  assert.ok(copper.pipes.length > 0);
  assert.ok(emerald.skyways.length > 0);
  assert.deepEqual(planCopperWorks(land, 0.43, 31), copper);
  assert.deepEqual(planEmeraldCity(land, 0.43, 31), emerald);
  assert.equal(planCopperWorks(land, 0.85, 31).stations.length, 0);
  assert.equal(planEmeraldCity(land, 0.85, 31).citadels.length, 0);
  assert.ok(
    planCopperWorks(land, 0.43, 31, 2).stations.length > copper.stations.length,
  );
  assert.ok(
    planEmeraldCity(land, 0.43, 31, 2).citadels.length >
      emerald.citadels.length,
  );
});

test("Copper buildings respect dry footprints and flooded cities lose their patrols", () => {
  const terrain = (u, v) =>
    u < 0.12 || v > 0.9 ? NaN : 0.5 + 0.22 * Math.sin(u * 8) * Math.cos(v * 7);
  const city = planCopperWorks(terrain, 0.43, 31);
  assert.ok(city.buildings.length > 10);
  assert.ok(new Set(city.buildings.map((b) => b.kind)).size >= 4);
  for (const b of city.buildings) {
    for (const [x, z] of [
      [-0.6, -0.6],
      [0.6, -0.6],
      [0.6, 0.6],
      [-0.6, 0.6],
      [0, 0],
    ]) {
      assert.ok(
        terrain((b.x + x * b.w) / 4 + 0.5, (b.z + z * b.d) / 3 + 0.5) > 0.445,
      );
    }
  }
  for (const road of city.patrols) {
    assert.ok(
      road.points.every((p) =>
        Number.isFinite(terrain(p.x / 4 + 0.5, p.z / 3 + 0.5)),
      ),
    );
  }
  const flooded = planCopperWorks(() => 0.15, 0.43, 31);
  assert.equal(flooded.buildings.length, 0);
  assert.equal(flooded.patrols.length, 0);
  assert.equal(planCopperWorks(() => 0.7, 0.43, 31, 0).buildings.length, 0);
});
