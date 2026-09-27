import test from "node:test";
import assert from "node:assert/strict";
import { reefGrowth } from "../src/environment/reef-growth.js";

test("reef colonies grow with broad raised sand, not an isolated spike", () => {
  const low = () => 0.3;
  const spike = (u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.01 ? 0.9 : 0.3);
  const mound = (u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.14 ? 0.75 : 0.3);
  assert.equal(reefGrowth(low, 0.5, 0.5), 0);
  assert.ok(reefGrowth(spike, 0.5, 0.5) < 0.05);
  assert.ok(reefGrowth(mound, 0.5, 0.5) > 0.7);
  assert.equal(reefGrowth(mound, 0.15, 0.15), 0);
});
