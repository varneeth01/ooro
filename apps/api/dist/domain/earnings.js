export function calculateEarnings(verifiedAdSeconds, config) {
    const minutes = BigInt(Math.floor(Math.max(0, verifiedAdSeconds) / 60));
    return config.baseMinor + minutes * config.perVerifiedAdMinuteMinor + config.peakBonusMinor;
}
