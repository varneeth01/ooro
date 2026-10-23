/**
 * Compare browser Origin with the public Host values provided by a reverse proxy.
 * NextRequest.nextUrl.origin may refer to an internal server behind Netlify/Coolify.
 * Origin is authoritative when present; Referer is a fallback only for older clients.
 */
export function isAcceptedAdminRequestOrigin(input: {
  origin: string | null
  referer: string | null
  host: string | null
  forwardedHost: string | null
  requestOrigin: string
}): boolean {
  const source = input.origin ?? input.referer
  if (!source) return false
  let parsed: URL
  try { parsed = new URL(source) } catch { return false }
  if (parsed.username || parsed.password || !['http:', 'https:'].includes(parsed.protocol)) return false
  // HTTPS is required for public production traffic; allow localhost HTTP in tests.
  if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) return false
  const hosts = [input.host, input.forwardedHost]
  try { hosts.push(new URL(input.requestOrigin).host) } catch { /* ignore invalid internal URL */ }
  return hosts.some(host => {
    if (!host || host.includes(',') || host.includes('/') || host.includes('@') || /\s/.test(host)) return false
    return parsed.host.toLowerCase() === host.trim().toLowerCase()
  })
}
