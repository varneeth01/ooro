import test from "node:test";
import assert from "node:assert/strict";
import { aspectRatioWarning, creativePlacement } from "./creative-fit.js";

test("placement geometry fits the supported screen layouts", () => {
  for (const layout of ["FULLSCREEN_AD", "FOUR_ZONE", "FOUR_ZONE_V3", "SPLIT_50_25_25"] as const) {
    const region = creativePlacement(layout);
    assert.ok(region.x >= 0 && region.y >= 0 && region.x + region.width <= 1 && region.y + region.height <= 1);
  }
  assert.equal(creativePlacement("SPLIT_50_25_25").aspectRatio, 4 / 3);
  assert.equal(creativePlacement("FOUR_ZONE_V3").width, 0.8);
  assert.equal(creativePlacement("FOUR_ZONE_V3").height, 0.85);
  assert.equal(creativePlacement("FOUR_ZONE_V3", "SPONSORED").y, 0.85);
  assert.equal(creativePlacement("FOUR_ZONE_V3", "SPONSORED").height, 0.15);
});

test("fit warnings cover portrait, square, and ultrawide creatives", () => {
  const target = creativePlacement("FULLSCREEN_AD").aspectRatio;
  assert.equal(aspectRatioWarning(1920, 1080, target), null);
  for (const [width, height] of [[1080, 1920], [1000, 1000], [3840, 800]]) assert.match(aspectRatioWarning(width, height, target) ?? "", /letterboxing/);
});
