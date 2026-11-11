import assert from "node:assert/strict";
import test from "node:test";
import { selfServeServiceability } from "./self-serve-serviceability.js";

test("Bengaluru is the supported planning market without live devices", () => {
  const result = selfServeServiceability(12.9716, 77.5946, 5);
  assert.equal(result.availability, "AVAILABLE");
  assert.ok(result.plannedAutos > 0);
});

test("Tirupati is not an active self-serve market after Bengaluru pivot", () => {
  assert.equal(selfServeServiceability(13.6288, 79.4192, 5).availability, "UNSUPPORTED");
});
