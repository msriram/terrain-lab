import test from "node:test";
import assert from "node:assert/strict";
import { createStableCityTerrain } from "../src/environment/stable-city-terrain.js";

test("city layout ignores small depth noise but follows reshaped sand", () => {
  const terrain = createStableCityTerrain();
  const options = { theme: "emerald", waterLevel: 0.43, layoutSeed: 31, density: 1 };
  assert.equal(terrain.update(() => 0.6, options), true);
  const original = terrain.sample(0.5, 0.5);
  for (let frame = 0; frame < 30; frame++) {
    assert.equal(terrain.update((u, v) => 0.6 + Math.sin(u * 371 + v * 257 + frame) * 0.015, options), false);
    assert.equal(terrain.sample(0.5, 0.5), original);
  }
  assert.equal(terrain.update((u, v) => 0.6 + (Math.hypot(u - 0.5, v - 0.5) < 0.09 ? 0.2 : 0), options), true);
  assert.ok(terrain.sample(0.5, 0.5) > original + 0.1);
  assert.equal(terrain.update(() => 0.6, { ...options, waterLevel: 0.5 }), true);
});

test("city layout preserves invalid terrain and reacts to terrain removal", () => {
  const terrain = createStableCityTerrain();
  const options = { theme: "cyberpunk", waterLevel: 0.43, layoutSeed: 31, density: 1 };
  assert.equal(terrain.update(() => 0.6, options), true);
  assert.equal(terrain.update((u, v) => u > 0.4 && u < 0.6 && v > 0.4 && v < 0.6 ? NaN : 0.6, options), true);
  assert.equal(Number.isNaN(terrain.sample(0.5, 0.5)), true);
});
