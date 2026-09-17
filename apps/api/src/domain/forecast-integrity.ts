export const DEFAULT_FORECAST_TTL_MINUTES = 15;
export type ForecastRange = { low: number; high: number };
export function forecastExpiresAt(generatedAt: Date, ttlMinutes = DEFAULT_FORECAST_TTL_MINUTES) { return new Date(generatedAt.getTime() + ttlMinutes * 60_000); }
export function isForecastFresh(generatedAt: Date | null | undefined, now = new Date(), ttlMinutes = DEFAULT_FORECAST_TTL_MINUTES) { return Boolean(generatedAt && forecastExpiresAt(generatedAt, ttlMinutes) > now); }
export function forecastChangedMaterially(previous: ForecastRange | null | undefined, next: ForecastRange, threshold = 0.15) { if (!previous || previous.high <= 0) return false; return Math.abs(next.low - previous.low) / previous.high > threshold || Math.abs(next.high - previous.high) / previous.high > threshold; }
