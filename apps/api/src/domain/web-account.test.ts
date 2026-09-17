import assert from "node:assert/strict";
import test from "node:test";
import { isPublicAccountType, onboardingPath } from "./web-account.js";

test("public signup accepts only the five supported account types", () => {
  for (const type of ["BUSINESS", "BRAND", "AGENCY", "NETWORK", "EXPLORER"]) assert.equal(isPublicAccountType(type), true);
  assert.equal(isPublicAccountType("ADMIN"), false);
  assert.equal(isPublicAccountType("SUPER_ADMIN"), false);
});

test("account types map to their onboarding routes", () => {
  assert.equal(onboardingPath("BUSINESS"), "/onboarding/business");
  assert.equal(onboardingPath("NETWORK"), "/onboarding/network");
});
