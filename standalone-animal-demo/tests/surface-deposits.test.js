import { test } from "node:test";
import assert from "node:assert/strict";
import {
  depositStyle,
  depositTarget,
  settleDeposit,
} from "../src/environment/surface-deposits.js";
test("snow settles on high ground, not water or steep walls", () => {
  const target = (h, s = 0) => depositTarget("snow", h, s, 0.43);
  assert.equal(target(0.3), 0);
  assert.equal(target(NaN), 0);
  assert.ok(target(0.9) > target(0.65));
  assert.ok(target(0.9, 8) < target(0.9));
});
test("contextual deposits respect shorelines and terrain", () => {
  assert.ok(
    depositTarget("moss", 0.5, 0, 0.43) > depositTarget("moss", 0.9, 0, 0.43),
  );
  assert.equal(depositTarget("silt", 0.9, 0, 0.43), 0);
  assert.ok(depositTarget("silt", 0.2, 0, 0.43) > 0);
  assert.ok(
    depositTarget("sand", 0.6, 0, 0.43) > depositTarget("sand", 0.6, 9, 0.43),
  );
  assert.equal(depositStyle("tundra", { weather: "snow" }).kind, "snow");
  assert.equal(depositStyle("moon", {}), null);
});
test("settling is gradual, frame independent, and melts after edits", () => {
  const first = settleDeposit(0, 1, 1);
  assert.ok(first > 0 && first < 0.2);
  assert.ok(settleDeposit(first, 1, 1) > first);
  assert.ok(settleDeposit(first, 0, 1) < first);
  assert.ok(
    Math.abs(settleDeposit(first, 1, 1) - settleDeposit(0, 1, 2)) < 1e-10,
  );
  assert.equal(settleDeposit(first, 1, 0), first);
});
