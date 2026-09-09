import test from "node:test";
import assert from "node:assert/strict";
import { isProductionRuntime } from "./production-runtime.ts";
import { assertPublicRazorpayKeyAllowed } from "./public-razorpay.ts";

const keys = ["CONTEXT", "DEPLOY_CONTEXT", "NODE_ENV", "ALLOW_LIVE_RAZORPAY_IN_DEVELOPMENT", "RAZORPAY_KEY_ID"] as const;

function withEnvironment(values: Partial<Record<(typeof keys)[number], string | undefined>>, callback: () => void) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (key in values && values[key] !== undefined) process.env[key] = values[key];
    else delete process.env[key];
  }
  try { callback(); } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
}

test("recognizes each production environment indicator", () => {
  for (const key of ["CONTEXT", "DEPLOY_CONTEXT", "NODE_ENV"] as const) {
    withEnvironment({ [key]: "production" }, () => assert.equal(isProductionRuntime(), true));
  }
});

test("does not treat development as production without an override", () => {
  withEnvironment({ NODE_ENV: "development" }, () => assert.equal(isProductionRuntime(), false));
});

test("explicit live-key override remains separate from production detection", () => {
  withEnvironment({ NODE_ENV: "development", ALLOW_LIVE_RAZORPAY_IN_DEVELOPMENT: "true", RAZORPAY_KEY_ID: "rzp_live_test" }, () => {
    assert.equal(isProductionRuntime(), false);
    assert.doesNotThrow(assertPublicRazorpayKeyAllowed);
  });
});

test("allows live keys for every production indicator", () => {
  for (const key of ["CONTEXT", "DEPLOY_CONTEXT", "NODE_ENV"] as const) {
    withEnvironment({ [key]: "production", RAZORPAY_KEY_ID: "rzp_live_test" }, () => assert.doesNotThrow(assertPublicRazorpayKeyAllowed));
  }
});

test("blocks live keys in unmarked development", () => {
  withEnvironment({ NODE_ENV: "development", RAZORPAY_KEY_ID: "rzp_live_test" }, () => assert.throws(assertPublicRazorpayKeyAllowed, /LIVE_PAYMENT_KEYS_NOT_ALLOWED_IN_DEVELOPMENT/));
});

test("allows test keys without a production indicator", () => {
  withEnvironment({ NODE_ENV: "development", RAZORPAY_KEY_ID: "rzp_test_test" }, () => assert.doesNotThrow(assertPublicRazorpayKeyAllowed));
});
