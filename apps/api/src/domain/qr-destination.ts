export const safeDestination = (value: unknown, allowLocalDevelopment = process.env.NODE_ENV === 'development') => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return allowLocalDevelopment && ['localhost', '127.0.0.1'].includes(parsed.hostname) ? parsed.toString() : null
    return parsed.toString()
  } catch { return null }
}
