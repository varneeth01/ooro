export type LocationPoint = { latitude: number; longitude: number; accuracyMeters: number; occurredAt: Date }

export function validDisplayLocation(point: Partial<LocationPoint>, now = new Date()): point is LocationPoint {
  return Number.isFinite(point.latitude) && point.latitude! >= -90 && point.latitude! <= 90
    && Number.isFinite(point.longitude) && point.longitude! >= -180 && point.longitude! <= 180
    && Number.isFinite(point.accuracyMeters) && point.accuracyMeters! >= 0
    && point.occurredAt instanceof Date && Number.isFinite(point.occurredAt.getTime())
    && point.occurredAt.getTime() <= now.getTime() + 2 * 60_000
    && point.occurredAt.getTime() >= now.getTime() - 10 * 60_000
  }

export function shouldRecordDisplayLocation(previous: LocationPoint | null, next: LocationPoint): boolean {
  if (!previous) return true
  const radians = (degrees: number) => degrees * Math.PI / 180
  const dLat = radians(next.latitude - previous.latitude)
  const dLon = radians(next.longitude - previous.longitude)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(previous.latitude)) * Math.cos(radians(next.latitude)) * Math.sin(dLon / 2) ** 2
  const distanceMeters = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return distanceMeters >= 125 || next.occurredAt.getTime() - previous.occurredAt.getTime() >= 90_000
}

export function boundedLocationLimit(value?: string): number {
  const parsed = Number(value ?? 200)
  return Math.min(Math.max(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 200, 1), 1000)
}
