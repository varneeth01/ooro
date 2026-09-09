export type DisplayConnectivity = 'ONLINE' | 'STALE' | 'OFFLINE' | 'NEVER_CONNECTED'
export const getDisplayConnectivity = (lastHeartbeat: Date | undefined, now = new Date()): DisplayConnectivity => {
  if (!lastHeartbeat) return 'NEVER_CONNECTED'
  const ageSeconds = Math.max(0, (now.getTime() - lastHeartbeat.getTime()) / 1000)
  if (ageSeconds <= 90) return 'ONLINE'
  if (ageSeconds <= 300) return 'STALE'
  return 'OFFLINE'
}
