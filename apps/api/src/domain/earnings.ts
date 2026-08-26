export type EarningsConfig = { baseMinor: bigint; perVerifiedAdMinuteMinor: bigint; peakBonusMinor: bigint }
export function calculateEarnings(verifiedAdSeconds: number, config: EarningsConfig) {
  const minutes = BigInt(Math.floor(Math.max(0, verifiedAdSeconds) / 60))
  return config.baseMinor + minutes * config.perVerifiedAdMinuteMinor + config.peakBonusMinor
}
