export const ESTIMATED_PASSENGER_OPPORTUNITIES_PER_AUTO_DAY = 24;
export const MAX_SLOTS_PER_LOOP = 28;
export const DEFAULT_CREATIVE_SECONDS = 15;

export function estimateSelfServe(budget: number, tier: "STANDARD" | "PREMIUM") {
  const rate = tier === "PREMIUM" ? 10 : 5;
  const estimatedImpressions = Math.max(0, budget) / rate;
  return { rate, estimatedImpressions, estimatedAutoDays: estimatedImpressions / ESTIMATED_PASSENGER_OPPORTUNITIES_PER_AUTO_DAY };
}

export function calculateAutoDayCost(autos: number, days: number, rate: number) { return Math.max(0, autos) * Math.max(0, days) * Math.max(0, rate); }

export function loopDurationSeconds() { return MAX_SLOTS_PER_LOOP * DEFAULT_CREATIVE_SECONDS; }
