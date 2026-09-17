import test from "node:test";
import assert from "node:assert/strict";
import { dateKeys, slotCandidates, slotFillRate } from "./inventory.js";
test("inventory creates one date key per active day", () => { assert.deepEqual(dateKeys(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-03T00:00:00Z")), ["2026-01-01", "2026-01-02", "2026-01-03"]); });
test("inventory uses at most 28 slot positions and prioritizes Premium+ slots", () => { assert.equal(slotCandidates(28, 4, "PREMIUM_PLUS")[0], 0); assert.equal(slotCandidates(28, 4, "STANDARD")[0], 4); assert.equal(slotCandidates(28, 4, "PREMIUM_PLUS").length, 28); });
test("fill rate excludes unavailable capacity by using the supplied denominator", () => { assert.equal(slotFillRate(14, 28), 0.5); assert.equal(slotFillRate(1, 0), 0); });
