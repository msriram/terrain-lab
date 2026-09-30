import test from "node:test";
import assert from "node:assert/strict";
import { findUnderwaterStructureSites } from "../src/environment/underwater-structures.js";

test("underwater buildings occupy raised seabed and leave deep water empty", () => {
  const sample = (u, v) => 0.16 + 0.48 * Math.exp(-(((u - 0.72) / 0.13) ** 2 + ((v - 0.45) / 0.13) ** 2));
  const sites = findUnderwaterStructureSites(sample, 0.43, 31, 14);
  assert.ok(sites.length > 0);
  assert.ok(sites.every(site => site.h >= 0.395));
  assert.ok(sites.every(site => Math.hypot(site.u - 0.72, site.v - 0.45) < 0.18));
  assert.deepEqual(findUnderwaterStructureSites(() => 0.16, 0.43), []);
  assert.deepEqual(findUnderwaterStructureSites(sample, 0.43, 31, 0), []);
});
