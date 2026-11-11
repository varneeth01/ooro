import { NextResponse } from "next/server";
import { createSelfServeForecast } from "@/lib/self-serve-forecast";
import { MIN_SELF_SERVE_BUDGET_RUPEES } from "@/lib/campaign-policy";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null) as Record<string, unknown> | null;
  const budget = Number(input?.budget); const latitude = Number(input?.latitude); const longitude = Number(input?.longitude); const radiusKm = Number(input?.radiusKm);
  const startsAt = new Date(String(input?.startDate)); const endsAt = new Date(String(input?.endDate));
  const deliveryTier = input?.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : input?.deliveryTier === undefined || input?.deliveryTier === "STANDARD" ? "STANDARD" : null;
  if (!Number.isFinite(budget) || budget < MIN_SELF_SERVE_BUDGET_RUPEES) return NextResponse.json({ error: { code: "MINIMUM_BUDGET", message: `Minimum OORO campaign budget is ₹${MIN_SELF_SERVE_BUDGET_RUPEES}.` } }, { status: 422 });
  if (![latitude, longitude, radiusKm].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || radiusKm < 1 || radiusKm > 10) return NextResponse.json({ error: { message: "Choose a valid location and radius between 1 km and 10 km." } }, { status: 422 });
  const calendarDate = /^\\d{4}-\\d{2}-\\d{2}$/;
  const indiaParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const datePart = (type: string) => indiaParts.find(part => part.type === type)?.value ?? "";
  const todayIndia = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
  const startValue = String(input?.startDate ?? "");
  const endValue = String(input?.endDate ?? "");
  if (!calendarDate.test(startValue) || !calendarDate.test(endValue) || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt.toISOString().slice(0, 10) !== startValue || endsAt.toISOString().slice(0, 10) !== endValue || startValue < todayIndia || endValue < startValue) return NextResponse.json({ error: { message: "Choose a future campaign date range in India time (IST)." } }, { status: 422 });
  if (!deliveryTier) return NextResponse.json({ error: { message: "Choose a valid delivery tier." } }, { status: 422 });
  try {
    const forecast = await createSelfServeForecast({ budget, startsAt, endsAt, latitude, longitude, radiusKm, deliveryTier });
    return NextResponse.json({ estimatedImpressionsLow: forecast.estimatedImpressionsLow, estimatedImpressionsHigh: forecast.estimatedImpressionsHigh, campaignDays: forecast.campaignDays, radiusKm: forecast.radiusKm, availability: forecast.availability, confidence: forecast.confidence, budget, location: String(input?.location ?? ""), deliveryTier, forecastVersion: forecast.forecastVersion, generatedAt: forecast.generatedAt.toISOString(), forecastExpiresAt: forecast.forecastExpiresAt.toISOString() });
  } catch (error) {
    const details = error instanceof Error ? { name: error.name, message: error.message } : { name: "UnknownError", message: "Unknown forecast failure" };
    console.error("[forecast] unavailable", details);
    return NextResponse.json({ error: { code: "FORECAST_SERVICE_UNAVAILABLE", message: "Forecast is temporarily unavailable. Please try again." } }, { status: 503 });
  }
}
