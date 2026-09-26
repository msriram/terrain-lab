import test from "node:test";
import assert from "node:assert/strict";
import { LavaFlow } from "../src/environment/flow.js";
test("lava conserves injected mass, travels downhill, and cools after eruption stops", () => {
  const flow = new LavaFlow(32, 24);
  flow.setTerrain((u) => 1 - u, [{ u: 0.3, v: 0.5 }]);
  for (let i = 0; i < 600; i++) flow.step(1 / 30);
  const mass = flow.mass.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(mass - 3) < 0.001);
  let xMass = 0;
  flow.mass.forEach((m, i) => (xMass += (i % 32) * m));
  assert.ok(xMass / mass > 12, "flow moves down the right-facing slope");
  const heat = Math.max(...flow.heat);
  flow.setTerrain((u) => 1 - u, []);
  for (let i = 0; i < 60; i++) flow.step(1 / 30);
  assert.ok(Math.max(...flow.heat) < heat);
  assert.ok(flow.mass.every((v) => Number.isFinite(v) && v >= 0));
});
