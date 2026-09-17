import assert from "node:assert/strict";
import test from "node:test";
import { selfServeServiceability } from "./self-serve-serviceability.js";

test("a supported market remains serviceable without live devices", () => {
  const result = selfServeServiceability(13.6288, 79.4192, 5);
  assert.equal(result.availability, "AVAILABLE");
  assert.ok(result.plannedAutos > 0);
});

test("an unsupported city cannot receive planned self-serve delivery", () => {
  assert.equal(selfServeServiceability(12.9716, 77.5946, 5).availability, "UNSUPPORTED");
});
