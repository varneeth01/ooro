import { createHmac } from 'node:crypto'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { config } from '../config.js'

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

export const normalizeDriverEmail = (value: string) => value.trim().toLowerCase()
export const driverEmailOtpHash = (email: string, code: string) => createHmac('sha256', config.jwtSecret).update(`driver-email:${email}:${code}`).digest('hex')

export async function verifyGoogleIdToken(idToken: string) {
  if (!config.googleWebClientId) throw new Error('Google authentication is not configured')
  const { payload } = await jwtVerify(idToken, googleJwks, {
    algorithms: ['RS256'],
    audience: config.googleWebClientId,
    issuer: ['accounts.google.com', 'https://accounts.google.com'],
  })
  if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) throw new Error('Google identity is not verified')
  return { subject: payload.sub, email: normalizeDriverEmail(payload.email) }
}
