import test from "node:test";
import assert from "node:assert/strict";
import { selfServeDisplayAssignmentAllowed } from "./campaign-policy";

test("self-serve campaign requests cannot assign or push to arbitrary displays", () => {
  assert.equal(selfServeDisplayAssignmentAllowed(0), true);
  assert.equal(selfServeDisplayAssignmentAllowed(1), false);
  assert.equal(selfServeDisplayAssignmentAllowed(20), false);
});
