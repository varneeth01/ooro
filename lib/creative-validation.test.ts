import test from "node:test";
import assert from "node:assert/strict";
import { hasExpectedCreativeSignature } from "./creative-validation";

test("creative validation checks content signatures rather than filename extensions", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(4)]);
  assert.equal(hasExpectedCreativeSignature(png, "image/png"), true);
  assert.equal(hasExpectedCreativeSignature(png, "video/mp4"), false);
  assert.equal(hasExpectedCreativeSignature(mp4, "video/mp4"), true);
  assert.equal(hasExpectedCreativeSignature(Buffer.from("../not-media"), "image/png"), false);
});
