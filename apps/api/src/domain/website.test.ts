import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWebsite } from "./website.js";

test("normalizes common website inputs", () => {
  assert.equal(normalizeWebsite("theooro.com"), "https://theooro.com");
  assert.equal(normalizeWebsite("www.theooro.com"), "https://www.theooro.com");
  assert.equal(normalizeWebsite("https://theooro.com"), "https://theooro.com");
  assert.equal(normalizeWebsite("http://theooro.com"), "http://theooro.com");
});

test("rejects malformed websites and preserves empty optional input", () => {
  assert.equal(normalizeWebsite(""), "");
  assert.equal(normalizeWebsite("not a website"), null);
});
