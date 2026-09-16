export type DisplayConnectivity = 'ONLINE' | 'STALE' | 'OFFLINE' | 'NEVER_CONNECTED'
export const getDisplayConnectivity = (lastHeartbeat: Date | undefined, now = new Date(), onlineSeconds = 90, staleSeconds = 300): DisplayConnectivity => {
  if (!lastHeartbeat) return 'NEVER_CONNECTED'
  const ageSeconds = Math.max(0, (now.getTime() - lastHeartbeat.getTime()) / 1000)
  if (ageSeconds <= onlineSeconds) return 'ONLINE'
  if (ageSeconds <= staleSeconds) return 'STALE'
  return 'OFFLINE'
}
