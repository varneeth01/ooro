import test from "node:test";
import assert from "node:assert/strict";
import { calculateAutoDayCost, estimateSelfServe, loopDurationSeconds } from "./advertiser-pricing.js";

test("self-serve standard and premium estimates use their published rates", () => {
  assert.deepEqual(estimateSelfServe(3000, "STANDARD"), { rate: 5, estimatedImpressions: 600, estimatedAutoDays: 25 });
  assert.equal(estimateSelfServe(3000, "PREMIUM").estimatedImpressions, 300);
});

test("brand auto-day calculation does not imply screen exclusivity", () => { assert.equal(calculateAutoDayCost(100, 30, 69), 207000); });

test("the planning loop benchmark is 28 fifteen-second slots", () => { assert.equal(loopDurationSeconds(), 420); });
