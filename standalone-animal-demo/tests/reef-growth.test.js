import test from "node:test";
import assert from "node:assert/strict";
import { reefGrowth } from "../src/environment/reef-growth.js";
import { findReefSites } from "../src/environment/reef-layout.js";

test("reef colonies grow with broad raised sand, not an isolated spike", () => {
  const low = () => 0.3;
  const spike = (u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.01 ? 0.9 : 0.3);
  const mound = (u, v) => (Math.hypot(u - 0.5, v - 0.5) < 0.14 ? 0.75 : 0.3);
  assert.equal(reefGrowth(low, 0.5, 0.5), 0);
  assert.ok(reefGrowth(spike, 0.5, 0.5) < 0.05);
  assert.ok(reefGrowth(mound, 0.5, 0.5) > 0.7);
  assert.equal(reefGrowth(mound, 0.15, 0.15), 0);
});

test("reef colonies follow a newly piled mound even when generic prop sites miss it", () => {
  const mound = (cx) => (u, v) =>
    Math.hypot(u - cx, v - 0.52) < 0.12 ? 0.78 : 0.25;
  const left = findReefSites(mound(0.23));
  const right = findReefSites(mound(0.77));
  assert.equal(left.length, 48);
  assert.equal(right.length, 48);
  assert.ok(left.every(site => site.u < 0.4));
  assert.ok(right.every(site => site.u > 0.6));
  assert.ok(left.every(site => mound(0.23)(site.u, site.v) > 0.43));
  assert.ok(right.every(site => mound(0.77)(site.u, site.v) > 0.43));
  assert.deepEqual(findReefSites(() => 0.25), []);
});
test("reefs never sprout beside a raised patch or below the selected water level", () => {
  const mound = (u, v) => Math.hypot(u - 0.52, v - 0.48) < 0.13 ? 0.74 : 0.3;
  const sites = findReefSites(mound, 31, 48, 0.5);
  assert.ok(sites.length >= 40);
  assert.ok(sites.every(site => mound(site.u, site.v) > 0.5));
  assert.equal(reefGrowth(() => 0.48, 0.5, 0.5, 0.5), 0);
});
