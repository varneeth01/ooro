export type ForecastInput = { budget: number; radiusKm: number; days: number; relevantAutos: number; commercialSlotDays: number; premiumSlotDays: number; plannedAutos?: number; plannedCommercialSlotDays?: number; plannedPremiumSlotDays?: number; activityFactor: number; deliveryTier: "STANDARD" | "PREMIUM_PLUS"; averageRidesPerDay: number; averagePassengersPerRide: number; minimumBudget: number };
export function roundRange(value: number) { if (value <= 0) return 0; const step = value < 1000 ? 50 : value < 10000 ? 100 : 500; return Math.round(value / step) * step; }
/** Keep fallback-only estimates honest without implying measured precision. */
export function applyForecastUncertainty(low: number, high: number, confidence: "HIGH" | "MEDIUM" | "EARLY_ESTIMATE", factor = 0.1) {
  if (confidence !== "EARLY_ESTIMATE" || high <= 0) return { low, high };
  const midpoint = Math.max(0, (low + high) / 2);
  const boundedFactor = Math.min(0.5, Math.max(0, factor));
  return {
    low: Math.max(0, Math.floor(midpoint * (1 - boundedFactor))),
    high: Math.max(0, Math.ceil(midpoint * (1 + boundedFactor) - 1e-9)),
  };
}
export function forecastDelivery(input: ForecastInput) {
  const budget = Math.max(0, input.budget); if (budget < input.minimumBudget) return { estimatedImpressionsLow: 0, estimatedImpressionsHigh: 0, estimatedActiveAutosLow: 0, estimatedActiveAutosHigh: 0, estimatedAutoDays: 0, inventoryAvailability: "BELOW_MINIMUM_BUDGET", confidenceLevel: "LOW" };
  const factor = Math.max(0, Math.min(1, input.activityFactor)); const plannedAutos = Math.max(0, input.plannedAutos ?? input.relevantAutos); const activeLow = Math.floor(plannedAutos * factor * 0.8); const activeHigh = Math.ceil(plannedAutos * Math.min(1, factor * 1.15)); const autoDaysLow = activeLow * input.days; const autoDaysHigh = activeHigh * input.days; const audienceLow = autoDaysLow * input.averageRidesPerDay * input.averagePassengersPerRide; const audienceHigh = autoDaysHigh * input.averageRidesPerDay * input.averagePassengersPerRide; const availableSlotDays = input.deliveryTier === "PREMIUM_PLUS" ? (input.plannedPremiumSlotDays ?? input.premiumSlotDays) : (input.plannedCommercialSlotDays ?? input.commercialSlotDays); const slotCapacity = availableSlotDays * input.averageRidesPerDay * input.averagePassengersPerRide; const internalRate = input.deliveryTier === "PREMIUM_PLUS" ? 10 : 5; const budgetCapacity = budget / internalRate; const low = roundRange(Math.min(budgetCapacity * 0.9, audienceLow, slotCapacity)); const high = roundRange(Math.min(budgetCapacity, audienceHigh, slotCapacity)); return { estimatedImpressionsLow: Math.min(low, high), estimatedImpressionsHigh: high, estimatedActiveAutosLow: activeLow, estimatedActiveAutosHigh: activeHigh, estimatedAutoDays: Math.round(((autoDaysLow + autoDaysHigh) / 2) * 10) / 10, inventoryAvailability: availableSlotDays <= 0 || plannedAutos <= 0 ? "NONE" : high < budgetCapacity ? "NEAR_CAPACITY" : "AVAILABLE", confidenceLevel: plannedAutos >= 10 ? "MEDIUM" : "LOW" };
}
