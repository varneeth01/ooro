export type PreviewLayout = "FULLSCREEN_AD" | "FOUR_ZONE" | "FOUR_ZONE_V3" | "SPLIT_50_25_25";
export type CreativePlacement = { x: number; y: number; width: number; height: number; aspectRatio: number };

export function creativePlacement(layout: PreviewLayout, slot: "MAIN" | "SPONSORED" = "MAIN"): CreativePlacement {
  const region = layout === "FOUR_ZONE_V3" && slot === "SPONSORED"
    ? { x: 0, y: 0.85, width: 0.8, height: 0.15 }
    : layout === "FOUR_ZONE_V3"
      ? { x: 0, y: 0, width: 0.8, height: 0.85 }
    : layout === "FOUR_ZONE"
    ? { x: 0, y: 0, width: 0.67, height: 0.88 }
    : layout === "SPLIT_50_25_25"
      ? { x: 0, y: 0, width: 0.75, height: 1 }
      : { x: 0, y: 0, width: 1, height: 1 };
  return { ...region, aspectRatio: (16 / 9) * region.width / region.height };
}

export function aspectRatioWarning(sourceWidth: number, sourceHeight: number, placementRatio: number, tolerance = 0.15): string | null {
  if (sourceWidth <= 0 || sourceHeight <= 0 || placementRatio <= 0) return null;
  const sourceRatio = sourceWidth / sourceHeight;
  if (Math.abs(sourceRatio - placementRatio) / placementRatio <= tolerance) return null;
  return `Creative aspect ratio ${sourceRatio.toFixed(2)}:1 differs from this placement (${placementRatio.toFixed(2)}:1). It will fit with letterboxing; review the preview for edge text and QR visibility.`;
}
