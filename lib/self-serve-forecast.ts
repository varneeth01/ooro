import { webPrisma } from "@/lib/web-prisma";
import { forecastChangedMaterially, forecastExpiresAt } from "@/apps/api/src/domain/forecast-integrity";
import { applyForecastUncertainty, forecastDelivery } from "@/apps/api/src/domain/self-serve-forecast";
import { selfServeServiceability, type SelfServeAvailability } from "@/apps/api/src/domain/self-serve-serviceability";

const VERSION = "planned-delivery-v1";
import { MIN_SELF_SERVE_BUDGET_RUPEES } from "./campaign-policy";
const DEFAULT = { averageRidesPerDay: 12, averagePassengersPerRide: 2, fallbackActiveAutoFactor: 0.6, minimumSelfServeBudget: MIN_SELF_SERVE_BUDGET_RUPEES, forecastTtlMinutes: 15 };
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) { const radians = (value: number) => value * Math.PI / 180; const dLat = radians(bLat - aLat); const dLng = radians(bLng - aLng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)); }
function dayCount(start: Date, end: Date) { return Math.max(1, Math.floor((Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1); }

export async function createSelfServeForecast(input: { budget: number; startsAt: Date; endsAt: Date; latitude: number; longitude: number; radiusKm: number; deliveryTier: "STANDARD" | "PREMIUM_PLUS" }) {
  const setting = await webPrisma.forecastSetting.findUnique({ where: { key: "DEFAULT" } });
  const assumptions = setting ?? DEFAULT;
  const days = dayCount(input.startsAt, input.endsAt);
  const serviceability = selfServeServiceability(input.latitude, input.longitude, input.radiusKm);
  const generatedAt = new Date();
  if (serviceability.availability === "UNSUPPORTED") return { estimatedImpressionsLow: 0, estimatedImpressionsHigh: 0, campaignDays: days, radiusKm: input.radiusKm, availability: "UNSUPPORTED" as SelfServeAvailability, confidence: "EARLY_ESTIMATE" as const, generatedAt, forecastExpiresAt: forecastExpiresAt(generatedAt, assumptions.forecastTtlMinutes), forecastVersion: `${VERSION}-${generatedAt.getTime()}` };
  const displays = await webPrisma.display.findMany({ where: { state: { not: "DISABLED" } }, select: { id: true, lastLatitude: true, lastLongitude: true, lastHeartbeatAt: true, vehicleId: true, inventoryConfig: { select: { commercialSlots: true, premiumSlots: true } } } });
  const relevant = displays.filter(item => item.lastLatitude !== null && item.lastLongitude !== null && Number.isFinite(item.lastLatitude) && Number.isFinite(item.lastLongitude) && distanceKm(input.latitude, input.longitude, item.lastLatitude, item.lastLongitude) <= input.radiusKm);
  const historicalAutos = new Set(relevant.map(item => item.vehicleId ?? item.id)).size;
  const plannedAutos = Math.max(serviceability.plannedAutos, historicalAutos);
  const commercialSlotDays = relevant.reduce((sum, item) => sum + (item.inventoryConfig?.commercialSlots ?? 28) * days, 0);
  const premiumSlotDays = relevant.reduce((sum, item) => sum + (item.inventoryConfig?.premiumSlots ?? 0) * days, 0);
  const plannedCommercialSlotDays = Math.max(commercialSlotDays, plannedAutos * serviceability.plannedCommercialSlotsPerAutoDay * days);
  const plannedPremiumSlotDays = Math.max(premiumSlotDays, plannedAutos * serviceability.plannedPremiumSlotsPerAutoDay * days);
  const recent = relevant.filter(item => item.lastHeartbeatAt && item.lastHeartbeatAt.getTime() > Date.now() - 7 * 86400000).length;
  const activityFactor = relevant.length ? Math.max(0.05, Math.min(1, (recent / relevant.length) || assumptions.fallbackActiveAutoFactor)) : assumptions.fallbackActiveAutoFactor;
  const result = forecastDelivery({ budget: input.budget, radiusKm: input.radiusKm, days, relevantAutos: historicalAutos, commercialSlotDays, premiumSlotDays, plannedAutos, plannedCommercialSlotDays, plannedPremiumSlotDays, activityFactor, deliveryTier: input.deliveryTier, averageRidesPerDay: assumptions.averageRidesPerDay, averagePassengersPerRide: assumptions.averagePassengersPerRide, minimumBudget: assumptions.minimumSelfServeBudget });
  const confidence = recent > 0 ? (historicalAutos >= 10 ? "HIGH" : "MEDIUM") : "EARLY_ESTIMATE";
  const range = applyForecastUncertainty(result.estimatedImpressionsLow, result.estimatedImpressionsHigh, confidence);
  return { estimatedImpressionsLow: range.low, estimatedImpressionsHigh: range.high, campaignDays: days, radiusKm: input.radiusKm, availability: serviceability.availability, confidence, generatedAt, forecastExpiresAt: forecastExpiresAt(generatedAt, assumptions.forecastTtlMinutes), forecastVersion: `${VERSION}-${generatedAt.getTime()}`, estimatedActiveAutosLow: result.estimatedActiveAutosLow, estimatedActiveAutosHigh: result.estimatedActiveAutosHigh, estimatedAutoDays: result.estimatedAutoDays, inventoryAvailability: result.inventoryAvailability, confidenceLevel: result.confidenceLevel };
}

export async function revalidateSelfServeForecast(campaign: { budget?: number | null; startsAt: Date | null; endsAt: Date | null; campaignCenterLat: number | null; campaignCenterLng: number | null; radiusKm: number | null; deliveryTier: string }) {
  const budget = Number(campaign.budget); if (!Number.isFinite(budget) || !campaign.startsAt || !campaign.endsAt || campaign.campaignCenterLat === null || campaign.campaignCenterLng === null || campaign.radiusKm === null) throw new Error("FORECAST_NOT_READY");
  return createSelfServeForecast({ budget, startsAt: campaign.startsAt, endsAt: campaign.endsAt, latitude: campaign.campaignCenterLat, longitude: campaign.campaignCenterLng, radiusKm: campaign.radiusKm, deliveryTier: campaign.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD" });
}

export function materiallyChanged(previous: unknown, next: { estimatedImpressionsLow: number; estimatedImpressionsHigh: number }) { const value = previous && typeof previous === "object" && !Array.isArray(previous) ? previous as Record<string, unknown> : null; return forecastChangedMaterially(value && typeof value.estimatedImpressionsLow === "number" && typeof value.estimatedImpressionsHigh === "number" ? { low: value.estimatedImpressionsLow, high: value.estimatedImpressionsHigh } : null, { low: next.estimatedImpressionsLow, high: next.estimatedImpressionsHigh }); }
