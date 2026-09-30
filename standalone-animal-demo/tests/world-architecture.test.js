import { test } from "node:test";
import assert from "node:assert/strict";
import { planCopperWorks, planEmeraldCity } from "../src/environment/world-architecture-layout.js";

test("Copper works and Emerald City grow only on dry terrain and recede below water", () => {
  const land = (u, v) => .69 + .08 * Math.sin(u * 8) * Math.cos(v * 7);
  const copper = planCopperWorks(land, .43, 31);
  const emerald = planEmeraldCity(land, .43, 31);
  assert.ok(copper.stations.length >= 5);
  assert.ok(emerald.citadels.length >= 5);
  assert.ok(copper.pipes.length > 0);
  assert.ok(emerald.skyways.length > 0);
  assert.deepEqual(planCopperWorks(land, .43, 31), copper);
  assert.deepEqual(planEmeraldCity(land, .43, 31), emerald);
  assert.equal(planCopperWorks(land, .85, 31).stations.length, 0);
  assert.equal(planEmeraldCity(land, .85, 31).citadels.length, 0);
  assert.ok(planCopperWorks(land, .43, 31, 2).stations.length > copper.stations.length);
  assert.ok(planEmeraldCity(land, .43, 31, 2).citadels.length > emerald.citadels.length);
});
