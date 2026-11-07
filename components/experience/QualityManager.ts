export type ExperienceQuality = "full" | "static";

/** Keep the WebGL scene off constrained devices and honor the user's motion setting. */
export function getExperienceQuality(): ExperienceQuality {
  if (typeof window === "undefined") return "static";
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const smallViewport = window.matchMedia("(max-width: 767px)");
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const lowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return query.matches || smallViewport.matches || connection?.saveData === true || connection?.effectiveType === "2g" || (lowMemory !== undefined && lowMemory <= 2) ? "static" : "full";
}
