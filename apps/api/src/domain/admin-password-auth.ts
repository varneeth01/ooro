import argon2 from 'argon2'
import { createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { config } from '../config.js'
import { prisma } from '../prisma.js'
import { ApiError } from '../errors.js'
import { adminRoles, isAdminRole } from './admin-auth.js'
import { sendAdminPasswordResetEmail, sendAdminPasswordSetupEmail } from './transactional-email.js'

export const adminPasswordMinLength = 12
const dummyPasswordHash = '$argon2id$v=19$m=19456,p=1,t=2$hmU4dPA6LV1H+vPI9djZFA$ZeY/c429X1LGk93HGFBxiXpdBNjChRRHjr4FDXVgcJI'

export const normalizeAdminEmail = (value: string) => value.trim().toLowerCase()
export const passwordTokenHash = (value: string) => createHash('sha256').update(value).digest('hex')
export const createPasswordToken = () => randomBytes(32).toString('base64url')
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 })
export const verifyPassword = (hash: string | null | undefined, password: string) => argon2.verify(hash ?? dummyPasswordHash, password)

export function validateAdminPassword(password: string) {
  if (password.length < adminPasswordMinLength || password.length > 128) throw new ApiError('WEAK_PASSWORD', `Password must be ${adminPasswordMinLength}–128 characters`, 422)
}

const rateLimitError = () => new ApiError('LOGIN_RATE_LIMITED', 'Too many sign-in attempts. Please try again later.', 429)
async function consumeRateLimit(key: string) {
  const now = new Date()
  const current = await prisma.adminLoginAttempt.findUnique({ where: { key } })
  if (!current) {
    try { await prisma.adminLoginAttempt.create({ data: { key, attempts: 1, windowStartedAt: now } }) } catch (error) { if (!isPrismaUniqueError(error)) throw error }
    return
  }
  if (current.blockedUntil && current.blockedUntil > now) throw rateLimitError()
  if (now.getTime() - current.windowStartedAt.getTime() >= config.adminLoginWindowSeconds * 1000) {
    await prisma.adminLoginAttempt.update({ where: { id: current.id }, data: { attempts: 1, windowStartedAt: now, blockedUntil: null } })
    return
  }
  const attempts = current.attempts + 1
  await prisma.adminLoginAttempt.update({ where: { id: current.id }, data: { attempts, blockedUntil: attempts >= config.adminLoginMaxAttempts ? new Date(now.getTime() + config.adminLoginLockSeconds * 1000) : undefined } })
  if (attempts >= config.adminLoginMaxAttempts) throw rateLimitError()
}

export async function enforceAdminLoginRateLimit(email: string, ip: string) {
  await consumeRateLimit(`email:${email}`)
  await consumeRateLimit(`ip:${ip}`)
}

export async function clearAdminLoginRateLimit(email: string) {
  await prisma.adminLoginAttempt.updateMany({ where: { key: `email:${email}` }, data: { attempts: 0, blockedUntil: null, windowStartedAt: new Date() } })
}

export async function issuePasswordSetup(userId: string, email: string, name: string | null) {
  const token = createPasswordToken()
  await prisma.user.update({ where: { id: userId }, data: { passwordSetupTokenHash: passwordTokenHash(token), passwordSetupTokenExpiresAt: new Date(Date.now() + config.adminPasswordSetupTtlSeconds * 1000) } })
  await sendAdminPasswordSetupEmail(email, name, `${config.adminWebBaseUrl}/admin/setup-password?token=${encodeURIComponent(token)}`)
}

export async function issuePasswordReset(userId: string, email: string, name: string | null) {
  const token = createPasswordToken()
  await prisma.user.update({ where: { id: userId }, data: { passwordResetTokenHash: passwordTokenHash(token), passwordResetTokenExpiresAt: new Date(Date.now() + config.adminPasswordResetTtlSeconds * 1000) } })
  await sendAdminPasswordResetEmail(email, name, `${config.adminWebBaseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`)
}

export async function findAdminByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, phone: true, role: true, accountStatus: true, passwordHash: true, passwordSetupTokenHash: true, passwordSetupTokenExpiresAt: true, passwordResetTokenHash: true, passwordResetTokenExpiresAt: true, failedLoginAttempts: true, lockedUntil: true } })
}

export function assertAdminUser(user: { role: string; accountStatus: string } | null) {
  return Boolean(user && isAdminRole(user.role) && adminRoles.includes(user.role) && user.accountStatus === 'ACTIVE')
}

export async function markAdminLoginFailure(userId: string, attempts: number) {
  const nextAttempts = attempts + 1
  await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: nextAttempts, lockedUntil: nextAttempts >= 5 ? new Date(Date.now() + config.adminLoginLockSeconds * 1000) : undefined } })
}

export async function resetAdminLoginFailures(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } })
}

export async function consumePasswordToken(kind: 'setup' | 'reset', token: string, password: string) {
  validateAdminPassword(password)
  const hash = passwordTokenHash(token)
  const field = kind === 'setup' ? 'passwordSetupTokenHash' : 'passwordResetTokenHash'
  const expiresField = kind === 'setup' ? 'passwordSetupTokenExpiresAt' : 'passwordResetTokenExpiresAt'
  const user = await prisma.user.findFirst({ where: { [field]: hash, [expiresField]: { gt: new Date() }, role: { in: adminRoles }, accountStatus: 'ACTIVE' } })
  if (!user) throw new ApiError('INVALID_PASSWORD_TOKEN', 'This password link is invalid or expired', 400)
  const passwordHash = await hashPassword(password)
  await prisma.$transaction(async (tx) => {
    const now = new Date()
    // Conditional update is the single-use gate: concurrent requests cannot both win.
    const claimed = await tx.user.updateMany({
      where: { id: user.id, [field]: hash, [expiresField]: { gt: now }, accountStatus: 'ACTIVE', role: { in: adminRoles } },
      data: { passwordHash, passwordChangedAt: now, passwordSetupTokenHash: null, passwordSetupTokenExpiresAt: null, passwordResetTokenHash: null, passwordResetTokenExpiresAt: null, failedLoginAttempts: 0, lockedUntil: null },
    })
    if (claimed.count !== 1) throw new ApiError('INVALID_PASSWORD_TOKEN', 'This password link is invalid or expired', 400)
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } })
  })
  return user
}

export function isPrismaUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
