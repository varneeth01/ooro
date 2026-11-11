export const MOBILITY_PROVIDERS = ['UBER', 'OLA', 'RAPIDO', 'OORO_NATIVE'] as const
export type MobilityProvider = typeof MOBILITY_PROVIDERS[number]

export const MOBILITY_EVENT_TYPES = [
  'RIDE_REQUESTED', 'RIDE_ACCEPTED', 'DRIVER_TO_PICKUP', 'ARRIVED_PICKUP',
  'PICKUP_DETECTED', 'PASSENGER_PICKED_UP', 'RIDE_ACTIVE', 'RIDE_CANCELLED',
  'RIDE_COMPLETED', 'UNKNOWN',
] as const
export type MobilityEventType = typeof MOBILITY_EVENT_TYPES[number]

export const MOBILITY_EVIDENCE = ['OBSERVED', 'INFERRED', 'UNKNOWN'] as const
export type MobilityEvidence = typeof MOBILITY_EVIDENCE[number]

export const APPROVED_NOTIFICATION_PACKAGES: Record<Exclude<MobilityProvider, 'OORO_NATIVE'>, string[]> = {
  UBER: ['com.ubercab.driver'],
  OLA: ['com.olacabs.oladriver'],
  RAPIDO: ['com.rapido.driver'],
}

export function providerForPackage(packageName: string): MobilityProvider | null {
  for (const [provider, packages] of Object.entries(APPROVED_NOTIFICATION_PACKAGES)) {
    if (packages.includes(packageName)) return provider as MobilityProvider
  }
  return null
}

export function isApprovedNotificationSource(provider: string, sourcePackage?: string) {
  if (provider === 'OORO_NATIVE') return sourcePackage === undefined
  return typeof sourcePackage === 'string' && (APPROVED_NOTIFICATION_PACKAGES[provider as Exclude<MobilityProvider, 'OORO_NATIVE'>] ?? []).includes(sourcePackage)
}

export function classifyEvidence(eventType: string, confidence: number): MobilityEvidence {
  if (!MOBILITY_EVENT_TYPES.includes(eventType as MobilityEventType) || eventType === 'UNKNOWN') return 'UNKNOWN'
  return confidence >= 0.8 ? 'OBSERVED' : 'INFERRED'
}
