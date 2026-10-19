import type { FastifyRequest } from 'fastify'
import { jwtVerify, SignJWT } from 'jose'
import { createHash, randomBytes } from 'node:crypto'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { forbidden, unauthorized } from './errors.js'

const secret = new TextEncoder().encode(config.jwtSecret)
export type AuthContext = { userId: string; role: string; driverId?: string; displayId?: string }

export const hashSecret = (value: string) => createHash('sha256').update(value).digest('hex')
export const randomSecret = (bytes = 32) => randomBytes(bytes).toString('hex')

export async function issueTokens(userId: string, role: string, driverId?: string) {
  const accessToken = await new SignJWT({ role, ...(driverId ? { driverId } : {}) })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt()
    .setExpirationTime(`${config.accessTtlSeconds}s`).sign(secret)
  const refreshToken = randomSecret()
  await prisma.session.create({ data: { userId, refreshTokenHash: hashSecret(refreshToken), expiresAt: new Date(Date.now() + config.refreshTtlSeconds * 1000) } })
  return { accessToken, refreshToken }
}

export async function authenticate(request: FastifyRequest): Promise<AuthContext> {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw unauthorized()
  try {
    const verified = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    if (!verified.payload.sub) throw unauthorized()
    return { userId: String(verified.payload.sub), role: String(verified.payload.role ?? 'DRIVER'), driverId: verified.payload.driverId ? String(verified.payload.driverId) : undefined }
  } catch { throw unauthorized('Invalid or expired access token') }
}

async function verifyCurrentUser(auth: AuthContext) {
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { role: true, accountStatus: true } })
  if (!user || user.accountStatus !== 'ACTIVE' || user.role !== auth.role) throw forbidden('Account access has changed')
  return auth
}
export async function requireAuth(request: FastifyRequest) {
  const auth = await authenticate(request)
  return ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE'].includes(auth.role) ? verifyCurrentUser(auth) : auth
}
export async function requireRoles(request: FastifyRequest, roles: string[]) {
  const auth = await authenticate(request)
  if (!roles.includes(auth.role)) throw forbidden()
  return verifyCurrentUser(auth)
}

export async function authenticateDisplay(request: FastifyRequest) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw unauthorized('Device authentication required')
  const display = await prisma.display.findFirst({ where: { deviceTokenHash: hashSecret(token) } })
  if (!display) throw unauthorized('Invalid device credentials')
  return display
}

export async function authenticateDeviceOs(request: FastifyRequest) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) throw unauthorized('DeviceOS authentication required')
  const credential = await prisma.deviceCredential.findFirst({
    where: {
      tokenHash: hashSecret(token),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      managedDevice: { revokedAt: null, enrollmentStatus: { not: 'REVOKED' } },
    },
    include: { managedDevice: { include: { display: true } } },
  })
  if (!credential) throw unauthorized('Invalid, expired, or revoked DeviceOS credentials')
  await prisma.deviceCredential.update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } })
  return credential.managedDevice
}

export const response = (request: FastifyRequest, data: unknown) => ({ data, error: null, requestId: request.id })
