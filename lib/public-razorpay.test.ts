import test from "node:test";
import assert from "node:assert/strict";
import { assertPublicRazorpayKeyAllowed, publicRazorpayConfig } from "./public-razorpay.ts";

const keys = ["RAZORPAY_MODE", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] as const;

function withEnvironment(values: Partial<Record<(typeof keys)[number], string | undefined>>, callback: () => void) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) {
    if (key in values && values[key] !== undefined) process.env[key] = values[key];
    else delete process.env[key];
  }
  try { callback(); } finally { for (const key of keys) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } }
}

test("allows live mode with a live key", () => withEnvironment({ RAZORPAY_MODE: "live", RAZORPAY_KEY_ID: "rzp_live_test", RAZORPAY_KEY_SECRET: "secret" }, () => {
  assert.equal(publicRazorpayConfig().mode, "live");
  assert.doesNotThrow(assertPublicRazorpayKeyAllowed);
}));

test("allows test mode with a test key", () => withEnvironment({ RAZORPAY_MODE: "test", RAZORPAY_KEY_ID: "rzp_test_test", RAZORPAY_KEY_SECRET: "secret" }, () => assert.doesNotThrow(assertPublicRazorpayKeyAllowed)));

test("rejects missing or invalid mode", () => withEnvironment({ RAZORPAY_KEY_ID: "rzp_live_test", RAZORPAY_KEY_SECRET: "secret" }, () => assert.throws(assertPublicRazorpayKeyAllowed, /RAZORPAY_MODE_NOT_CONFIGURED/)));

test("rejects a key that does not match live mode", () => withEnvironment({ RAZORPAY_MODE: "live", RAZORPAY_KEY_ID: "rzp_test_test", RAZORPAY_KEY_SECRET: "secret" }, () => assert.throws(assertPublicRazorpayKeyAllowed, /RAZORPAY_KEY_MODE_MISMATCH/)));

test("rejects a key that does not match test mode", () => withEnvironment({ RAZORPAY_MODE: "test", RAZORPAY_KEY_ID: "rzp_live_test", RAZORPAY_KEY_SECRET: "secret" }, () => assert.throws(assertPublicRazorpayKeyAllowed, /RAZORPAY_KEY_MODE_MISMATCH/)));

test("reports missing credentials separately", () => withEnvironment({ RAZORPAY_MODE: "live", RAZORPAY_KEY_ID: "rzp_live_test" }, () => assert.throws(assertPublicRazorpayKeyAllowed, /PAYMENT_PROVIDER_NOT_CONFIGURED/)));
