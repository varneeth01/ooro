/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify'
import { deliverOtp } from './domain/otp-delivery.js'
import { registerNetworkOperations } from './network-operations.js'
import { registerOperations } from './operations.js'
import { registerAdminManagement } from './admin-management.js'
import { registerAssetRoutes } from './asset-routes.js'
import { Prisma } from '@prisma/client'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { z } from 'zod'
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { ApiError, forbidden, notFound, unauthorized } from './errors.js'
import { authenticateDeviceOs, authenticateDisplay, hashSecret, issueTokens, randomSecret, requireAuth, requirePermission, requireRoles, response } from './http.js'
import { assertRideTransition, stateForEvent } from './domain/ride-state.js'
import { verifyRide } from './domain/verification.js'
import { calculateEarnings } from './domain/earnings.js'
import { buildDisplayManifest } from './domain/campaign-eligibility.js'
import { campaignPackages } from './domain/campaign-packages.js'
import { findGuestOrder, listGuestOrders, isMongoError } from './domain/guest-orders.js'
import { receiptPdf } from './domain/receipt.js'
import { boundedLocationLimit, shouldRecordDisplayLocation, validDisplayLocation } from './domain/display-location.js'
import { getDisplayConnectivity } from './domain/display-health.js'
import { canonicalProofId, canonicalProofStatus, proofIdentityBelongsToDisplay } from './domain/proof-policy.js'
import { adminRoles } from './domain/admin-auth.js'
import { asDeviceOsJson } from './domain/deviceos-http.js'
import { assertSigningCertificateContinuity, decodeApkBase64, inspectApk } from './domain/apk-release.js'
import { deviceOsStorage, parseDeviceOsRange, sliceDeviceOsContent, verifyLocalDownloadSignature } from './domain/deviceos-storage.js'
import { campaignHealthGate, createDeviceOsCampaign, deploymentTargetingModes, isWithinMaintenanceWindow, pauseDeviceOsCampaign, resumeDeviceOsCampaign } from './domain/deviceos-deployment.js'
import { isHealthyInstallationReportValid, retryDelayMs, validateDeviceOsEventTransition } from './domain/deviceos.js'
import { assertAdminUser, clearAdminLoginRateLimit, consumePasswordToken, enforceAdminLoginRateLimit, findAdminByEmail, issuePasswordReset, markAdminLoginFailure, normalizeAdminEmail, resetAdminLoginFailures, validateAdminPassword, verifyPassword } from './domain/admin-password-auth.js'

const app = Fastify({ logger: true })
const deviceOsUploadBodyLimit = Math.ceil(config.deviceOsMaxApkBytes * 4 / 3) + 1024 * 1024
app.register(cors, { origin: config.corsOrigins })
app.register(helmet)
app.addHook('onRequest', async (request) => {
  request.log.info({ requestPath: request.raw.url?.split('?')[0] ?? request.url.split('?')[0] }, 'requestPath')
})
app.removeContentTypeParser('application/json')
app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => { try { (request as any).rawBody = body; done(null, JSON.parse(body as string)) } catch (error) { done(error as Error, undefined) } })
app.addHook('preHandler', async (request) => { if (request.url.split('?')[0].startsWith('/api/admin/')) await requireRoles(request, adminRoles) })

const ok = (request: any, data: unknown, reply: any) => reply.send(response(request, data))
const sendDeviceOsApk = (request: any, reply: any, content: Buffer, filename?: string) => {
  const range = parseDeviceOsRange(typeof request.headers.range === 'string' ? request.headers.range : undefined, content.length)
  const common = reply.header('content-type', 'application/vnd.android.package-archive').header('accept-ranges', 'bytes').header('content-disposition', filename ? `attachment; filename="${filename.replace(/"/g, '')}"` : 'attachment')
  if (range === null) return common.header('content-length', content.length).send(content)
  if (range === 'INVALID') return reply.code(416).header('content-range', `bytes */${content.length}`).send()
  const { start, end } = range
  return common.code(206).header('content-length', end - start + 1).header('content-range', `bytes ${start}-${end}/${content.length}`).send(sliceDeviceOsContent(content, { start, end }))
}
const bodyOf = <T>(request: any, schema: z.ZodType<T>) => {
  const parsed = schema.safeParse(request.body)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 422)
  return parsed.data
}
const asJson = (value: unknown): any => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item))
const driverFrom = async (auth: { driverId?: string }) => {
  if (!auth.driverId) throw forbidden('Driver account required')
  const driver = await prisma.driver.findUnique({ where: { id: auth.driverId }, include: { user: true } })
  if (!driver) throw notFound('Driver not found')
  if (driver.user.accountStatus === 'SUSPENDED' || driver.user.accountStatus === 'CLOSED') throw forbidden('Driver account is restricted')
  return driver
}
const hashOtp = (phone: string, code: string) => createHash('sha256').update(`${phone}:${code}`).digest('hex')
const generatePairingCode = () => { const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; const bytes = randomBytes(6); return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('') }
const authStoreError = (error: unknown) => {
  if (error instanceof ApiError) return error
  if (error instanceof Prisma.PrismaClientInitializationError) return new ApiError('AUTH_STORE_UNAVAILABLE', 'Authentication is temporarily unavailable', 503)
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P1001', 'P2022'].includes(error.code)) return new ApiError('AUTH_STORE_UNAVAILABLE', 'Authentication is temporarily unavailable', 503)
  return error
}
const deviceRequestId = z.string().uuid()
const consumeDeviceRequest = async (tx: Prisma.TransactionClient, managedDeviceId: string, requestId: string, endpoint: string) => {
  try {
    await tx.deviceRequestReceipt.create({ data: { managedDeviceId, requestId, endpoint } })
    await tx.deviceRequestReceipt.deleteMany({ where: { managedDeviceId, receivedAt: { lt: new Date(Date.now() - Math.max(1, config.deviceOsRequestReceiptRetentionDays) * 24 * 60 * 60 * 1000) } } })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false
    throw error
  }
}

app.get('/health', async (request, reply) => ok(request, { status: 'ok', service: 'ooro-api' }, reply))
app.get('/api/health', async (request, reply) => ok(request, { status: 'ok', service: 'ooro-api' }, reply))
app.get('/api/health/db', async (request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return ok(request, { status: 'ok', service: 'ooro-api', database: 'ok' }, reply)
  } catch {
    return reply.code(503).send({ data: null, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database dependency unavailable' } })
  }
})
app.get('/go/:token', async (request, reply) => {
  const token = String((request.params as { token?: string }).token ?? '')
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) throw notFound('Tracking link not found')
  const link = await prisma.campaignTrackingLink.findUnique({ where: { token } })
  if (!link || !link.active || (link.expiresAt && link.expiresAt <= new Date())) throw notFound('Tracking link not found')
  let destination: URL
  try { destination = new URL(link.destinationUrl) } catch { throw notFound('Tracking link not found') }
  if (destination.protocol !== 'https:' && !(config.nodeEnv === 'development' && ['localhost', '127.0.0.1'].includes(destination.hostname))) throw notFound('Tracking link not found')
  await prisma.qrScan.create({ data: { eventId: randomUUID(), trackingLinkId: link.id, campaignId: link.campaignId, creativeId: link.creativeId, displayId: link.displayId } })
  return reply.code(302).header('Location', destination.toString()).send()
})
app.get('/api/admin/campaigns/:campaignId/qr-analytics', async (request, reply) => {
  await requirePermission(request, 'campaign:read')
  const { campaignId } = request.params as { campaignId: string }
  const [completedPlays, qrScans] = await Promise.all([
    prisma.proofOfPlay.count({ where: { campaignId, playbackCompleted: true } }),
    prisma.qrScan.count({ where: { campaignId } }),
  ])
  return ok(request, { completedPlays, qrScans, scanRate: completedPlays === 0 ? null : (qrScans / completedPlays) * 100 }, reply)
})
app.get('/api/public/campaign-packages', async (request, reply) => ok(request, campaignPackages.filter((item) => item.active), reply))
const paymentProcessingRetired = () => { throw new ApiError('PAYMENT_PROCESSING_RETIRED', 'Online payment processing is no longer available', 410) }
app.post('/api/public/campaign-orders', async () => paymentProcessingRetired())
app.post('/api/public/campaign-orders/verify', async () => paymentProcessingRetired())
app.get('/api/public/campaign-orders/:orderNumber', async (request, reply) => { const { orderNumber } = request.params as { orderNumber: string }; const accessToken = String((request.query as { accessToken?: string }).accessToken ?? request.headers['x-order-access-token'] ?? ''); const order = await findGuestOrder(orderNumber); if (!order || !accessToken || hashSecret(accessToken) !== order.receiptAccessTokenHash) throw unauthorized('Secure order access required'); return ok(request, { orderNumber: order.orderNumber, name: order.name, email: order.email, businessName: order.businessName, packageId: order.packageId, city: order.city, autos: order.autos, hoursPerDay: order.hoursPerDay, campaignDurationDays: order.campaignDurationDays, amount: order.amount, currency: order.currency, status: order.status, paymentCapturedAt: order.paymentCapturedAt, receiptNumber: order.receiptNumber, emailDeliveryStatus: order.emailDeliveryStatus }, reply) })
app.get('/api/public/campaign-orders/:orderNumber/receipt', async (request, reply) => { const { orderNumber } = request.params as { orderNumber: string }; const accessToken = String((request.query as { accessToken?: string }).accessToken ?? request.headers['x-order-access-token'] ?? ''); const order = await findGuestOrder(orderNumber); if (!order || !accessToken || hashSecret(accessToken) !== order.receiptAccessTokenHash) throw unauthorized('Secure receipt access required'); if (order.status !== 'PAID' && order.status !== 'FULFILLED') throw new ApiError('RECEIPT_NOT_READY', 'Receipt is not available', 409); return reply.type('application/pdf').header('Content-Disposition', `attachment; filename="${order.receiptNumber ?? order.orderNumber}.pdf"`).send(receiptPdf(order)) })
app.post('/api/webhooks/razorpay', async () => paymentProcessingRetired())

app.post('/api/auth/request-otp', async (request, reply) => {
  const { phone } = bodyOf(request, z.object({ phone: z.string().min(7).max(20) }))
  const recent = await prisma.otpChallenge.count({where:{phone,createdAt:{gte:new Date(Date.now()-60000)}}}); if(recent>=3) throw new ApiError('OTP_RATE_LIMIT','Please wait before requesting another code',429)
  const code = config.nodeEnv !== 'production' && config.devMockOtpEnabled ? config.devMockOtp : String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000)
  await deliverOtp(phone, code)
  await prisma.otpChallenge.create({ data: { phone, codeHash: hashOtp(phone, code), expiresAt } })
  return ok(request, { expiresAt, ...(config.nodeEnv !== 'production' && config.devMockOtpEnabled ? { devOtp: code } : {}) }, reply)
})

app.post('/api/auth/verify-otp', async (request, reply) => {
  const { phone, code, name } = bodyOf(request, z.object({ phone: z.string().min(7), code: z.string().length(6), name: z.string().min(1).optional() }))
  const challenge = await prisma.otpChallenge.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } })
  if(challenge) await prisma.otpChallenge.update({where:{id:challenge.id},data:{attempts:{increment:1}}})
  if (!challenge || challenge.attempts >= 5 || challenge.codeHash !== hashOtp(phone, code)) throw new ApiError('INVALID_OTP', 'Invalid or expired OTP', 401)
  const consumed = await prisma.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt:null, attempts:{lte:5} }, data: { consumedAt: new Date() } }); if(consumed.count!==1) throw unauthorized('Code already used or too many attempts')
  // Driver SMS OTP must never authenticate administrator or other non-driver accounts.
  const existingUser = await prisma.user.findUnique({ where: { phone }, select: { role: true } })
  if (existingUser && existingUser.role !== 'DRIVER') throw unauthorized('Driver authentication not permitted for this account')
  const user = await prisma.user.upsert({ where: { phone }, update: name ? { name } : {}, create: { phone, name, role: 'DRIVER', accountStatus: 'PENDING' } })
  if (user.role !== 'DRIVER') throw unauthorized('Driver authentication not permitted for this account')
  const driver = await prisma.driver.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
  const tokens = await issueTokens(user.id, user.role, driver.id)
  return ok(request, { ...tokens, user: { id: user.id, phone: user.phone, role: user.role }, driver: { id: driver.id, onboardingStatus: driver.onboardingStatus } }, reply)
})

app.post('/api/auth/admin/login', async (request, reply) => {
  try {
    const { email: rawEmail, password } = bodyOf(request, z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128) }))
    const email = normalizeAdminEmail(rawEmail)
    await enforceAdminLoginRateLimit(email, request.ip)
    const user = await findAdminByEmail(email)
    const validPassword = await verifyPassword(user?.passwordHash, password)
    const locked = Boolean(user?.lockedUntil && user.lockedUntil > new Date())
    if (!user || !validPassword || !assertAdminUser(user) || !user.passwordHash || locked) {
      if (user && assertAdminUser(user) && !locked && user.passwordHash && !validPassword) await markAdminLoginFailure(user.id, user.failedLoginAttempts)
      throw unauthorized('Invalid email or password')
    }
    await Promise.all([resetAdminLoginFailures(user.id), clearAdminLoginRateLimit(email)])
    const tokens = await issueTokens(user.id, user.role, undefined, { userAgent: request.headers['user-agent'], ipAddress: request.ip })
    return ok(request, { ...tokens, user: { id: user.id, email: user.email, role: user.role, name: user.name } }, reply)
  } catch (error) { throw authStoreError(error) }
})

app.post('/api/auth/admin/request-password-reset', async (request, reply) => {
  const { email: rawEmail } = bodyOf(request, z.object({ email: z.string().email().max(254) }))
  const email = normalizeAdminEmail(rawEmail)
  const user = await findAdminByEmail(email)
  if (user && assertAdminUser(user) && user.email) {
    try { await issuePasswordReset(user.id, user.email, user.name) } catch (error) { request.log.error({ err: error }, 'admin password reset email failed') }
  }
  return reply.code(202).send(response(request, { message: 'If the account exists, password reset instructions will be sent.' }))
})

app.post('/api/auth/admin/setup-password', async (request, reply) => {
  const { token, password } = bodyOf(request, z.object({ token: z.string().min(32).max(128), password: z.string().min(1).max(128) }))
  validateAdminPassword(password)
  await consumePasswordToken('setup', token, password)
  return ok(request, { passwordSet: true }, reply)
})

app.post('/api/auth/admin/reset-password', async (request, reply) => {
  const { token, password } = bodyOf(request, z.object({ token: z.string().min(32).max(128), password: z.string().min(1).max(128) }))
  validateAdminPassword(password)
  await consumePasswordToken('reset', token, password)
  return ok(request, { passwordReset: true }, reply)
})

app.post('/api/auth/refresh', async (request, reply) => {
  const { refreshToken } = bodyOf(request, z.object({ refreshToken: z.string().min(20) }))
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: hashSecret(refreshToken) }, include: { user: { include: { driver: true } } } })
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.accountStatus !== 'ACTIVE') throw new ApiError('INVALID_SESSION', 'Refresh session is invalid', 401)
  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } })
  return ok(request, await issueTokens(session.userId, session.user.role, session.user.driver?.id), reply)
})
app.post('/api/auth/logout', async (request, reply) => {
  const { refreshToken } = bodyOf(request, z.object({ refreshToken: z.string().min(20) }))
  await prisma.session.updateMany({ where: { refreshTokenHash: hashSecret(refreshToken) }, data: { revokedAt: new Date() } })
  return ok(request, { loggedOut: true }, reply)
})
app.get('/api/auth/session', async (request, reply) => { const auth = await requireAuth(request); return ok(request, auth, reply) })

app.get('/api/drivers/me', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, asJson(driver), reply) })
app.patch('/api/drivers/me', async (request, reply) => {
  const auth = await requireAuth(request); const driver = await driverFrom(auth)
  const input = bodyOf(request, z.object({ name: z.string().min(1).optional(), email: z.string().email().optional(), city: z.string().optional(), preferredLanguage: z.string().optional(), dateOfBirth: z.coerce.date().optional(), profilePhotoUrl: z.string().url().optional(), emergencyContact: z.record(z.string(), z.string()).optional() }))
  const updated = await prisma.$transaction(async (tx) => { if (input.name !== undefined || input.email !== undefined) await tx.user.update({ where: { id: driver.userId }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.email !== undefined ? { email: input.email } : {}) } }); return tx.driver.update({ where: { id: driver.id }, data: { city: input.city, preferredLanguage: input.preferredLanguage, dateOfBirth: input.dateOfBirth, profilePhotoUrl: input.profilePhotoUrl, emergencyContact: input.emergencyContact as any } }) })
  return ok(request, asJson(updated), reply)
})
app.get('/api/drivers/me/status', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const docs = await prisma.kycDocument.findMany({ where: { driverId: d.id } }); return ok(request, { onboardingStatus: d.onboardingStatus, accountStatus: d.user.accountStatus, kyc: docs.map((x) => ({ id: x.id, type: x.documentType, status: x.status })) }, reply) })
app.post('/api/fleet/inquiries', async (request, reply) => { const input = bodyOf(request, z.object({ name: z.string(), phone: z.string(), email: z.string().email().optional(), companyName: z.string().optional(), city: z.string().optional(), fleetSize: z.number().int().positive().optional(), vehicleTypes: z.array(z.string()).default([]), message: z.string().optional() })); return ok(request, await prisma.fleetInquiry.create({ data: input }), reply) })

app.post('/api/kyc/documents', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const input = bodyOf(request, z.object({ documentType: z.string(), storageKey: z.string().min(1), maskedDocumentNumber: z.string().optional(), expiresAt: z.coerce.date().optional() })); return ok(request, await prisma.kycDocument.create({ data: { driverId: driver.id, ...input } }), reply) })
app.get('/api/kyc/documents', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, await prisma.kycDocument.findMany({ where: { driverId: driver.id }, orderBy: { submittedAt: 'desc' } }), reply) })
app.get('/api/kyc/status', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, await prisma.kycDocument.groupBy({ by: ['status'], where: { driverId: driver.id }, _count: true }), reply) })

const vehicleSchema = z.object({ type: z.enum(['AUTO', 'CAB']), cabType: z.string().optional(), registrationNumber: z.string().min(3), manufacturer: z.string().min(1), model: z.string().min(1), year: z.number().int().optional(), fuelType: z.string().optional() })
app.post('/api/vehicles', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, vehicleSchema); return ok(request, await prisma.vehicle.create({ data: { driverId: d.id, ...input } }), reply) })
app.get('/api/vehicles', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.vehicle.findMany({ where: { driverId: d.id }, include: { displays: true } }), reply) })
app.get('/api/vehicles/:vehicleId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { vehicleId } = request.params as { vehicleId: string }; const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverId: d.id }, include: { displays: true } }); if (!v) throw notFound('Vehicle not found'); return ok(request, v, reply) })
app.patch('/api/vehicles/:vehicleId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { vehicleId } = request.params as { vehicleId: string }; const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverId: d.id } }); if (!v) throw notFound('Vehicle not found'); return ok(request, await prisma.vehicle.update({ where: { id: vehicleId }, data: bodyOf(request, vehicleSchema.partial()) }), reply) })

app.post('/api/displays/pairing-code', async (request, reply) => {
  await requirePermission(request, 'device:write'); const input = bodyOf(request, z.object({ displayId: z.string().uuid().optional(), deviceId: z.string().min(1).optional(), name: z.string().default('OORO Display'), ownershipType: z.string().optional() }))
  const display = input.displayId ? await prisma.display.findFirst({ where: { id: input.displayId } }) : await prisma.display.create({ data: { deviceId: input.deviceId ?? `pending-${randomSecret(8)}`, name: input.name, ownershipType: input.ownershipType } })
  if (!display) throw notFound('Display not found')
  const code = generatePairingCode(); const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.displayPairingCode.create({ data: { displayId: display.id, codeHash: hashSecret(code), codeLast4: code.slice(-4), expiresAt } })
  return ok(request, { displayId: display.id, pairingCode: code, expiresAt }, reply)
})
app.post('/api/displays/pair', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ pairingCode: z.string().min(6), vehicleId: z.string().uuid(), ownershipType: z.string().optional() })); const v = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, driverId: d.id } }); if (!v) throw notFound('Vehicle not found'); const p = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }); if (!p) throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400); const display = await prisma.$transaction(async (tx) => { await tx.displayPairingCode.update({ where: { id: p.id }, data: { consumedAt: new Date() } }); return tx.display.update({ where: { id: p.displayId }, data: { vehicleId: v.id, ownershipType: input.ownershipType ?? v.type, state: 'PAIRING' } }) }); return ok(request, { displayId: display.id, vehicleId: v.id, state: display.state, pairedAt: new Date() }, reply) })
app.get('/api/displays/:displayId/status', async (request, reply) => { const auth = await requireAuth(request); const { displayId } = request.params as { displayId: string }; const display = await prisma.display.findUnique({ where: { id: displayId }, include: { vehicle: true, heartbeats: { orderBy: { receivedAt: 'desc' }, take: 1 } } }); if (!display) throw notFound('Display not found'); if (display.vehicle && auth.driverId !== display.vehicle.driverId && !['ADMIN','SUPER_ADMIN','OPERATIONS'].includes(auth.role)) throw forbidden(); const hb = display.heartbeats[0]; const state = getDisplayConnectivity(hb?.receivedAt, new Date(), config.heartbeatOnlineSeconds, config.heartbeatDegradedSeconds); const connectivity = state === 'STALE' ? 'DEGRADED' : state; const { deviceTokenHash: _tokenHash, lastLatitude: _latitude, lastLongitude: _longitude, lastLocationAccuracy: _accuracy, lastLocationAt: _locationAt, ...safeDisplay } = display; const safeHeartbeat = hb ? { ...hb, ...(adminRoles.includes(auth.role) ? {} : { latitude: undefined, longitude: undefined, accuracyMeters: undefined, speedMps: undefined, headingDegrees: undefined, locationOccurredAt: undefined }) } : null; return ok(request, { ...asJson({ ...safeDisplay, ...(adminRoles.includes(auth.role) ? { lastLatitude: display.lastLatitude, lastLongitude: display.lastLongitude, lastLocationAccuracy: display.lastLocationAccuracy, lastLocationAt: display.lastLocationAt } : {}) }), connectivity, lastHeartbeat: safeHeartbeat ? asJson(safeHeartbeat) : null }, reply) })

app.post('/api/device/pair', async (request, reply) => { const input = bodyOf(request, z.object({ pairingCode: z.string().min(6), deviceId: z.string().min(1), deviceName: z.string().optional(), manufacturer: z.string().optional(), model: z.string().optional(), androidVersion: z.string().optional(), appVersion: z.string().optional() })); const p = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }); if (!p) throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400); const token = randomSecret(); const display = await prisma.$transaction(async (tx) => { await tx.displayPairingCode.update({ where: { id: p.id }, data: { consumedAt: new Date() } }); return tx.display.update({ where: { id: p.displayId }, data: { deviceId: input.deviceId, name: input.deviceName ?? 'OORO Screen', deviceTokenHash: hashSecret(token), state: 'READY', appVersion: input.appVersion } }) }); return ok(request, { success: true, deviceToken: token, screenId: display.id, displayId: display.id, workspaceId: 'default', deviceName: display.name }, reply) })

app.post('/api/deviceos/enroll', async (request, reply) => {
  const input = bodyOf(request, z.object({
    pairingCode: z.string().trim().min(6).max(32),
    agentVersionName: z.string().trim().max(80).optional(),
    agentVersionCode: z.coerce.bigint().nonnegative().optional(),
    androidVersion: z.string().trim().max(80).optional(),
    manufacturer: z.string().trim().max(120).optional(),
    model: z.string().trim().max(120).optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
  }))
  const now = new Date()
  const pairing = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, select: { id: true, displayId: true } })
  if (!pairing) throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400)
  const token = randomSecret()
  const credentialId = randomUUID()
  const managedDevice = await prisma.$transaction(async (tx) => {
    const consumed = await tx.displayPairingCode.updateMany({ where: { id: pairing.id, consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } })
    if (consumed.count !== 1) throw new ApiError('PAIRING_CODE_ALREADY_USED', 'Pairing code is no longer available', 409)
    const device = await tx.managedDevice.upsert({
      where: { displayId: pairing.displayId },
      create: { displayId: pairing.displayId, enrollmentStatus: 'ENROLLED', agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: input.capabilities as any, lastSeenAt: now },
      update: { enrollmentStatus: 'ENROLLED', revokedAt: null, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: input.capabilities as any, lastSeenAt: now, rowVersion: { increment: 1 } },
    })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_ENROLLED', entityType: 'ManagedDevice', entityId: device.id, after: { displayId: device.displayId, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode?.toString() } as any, requestId: request.id } })
    return device
  })
  return ok(request, { managedDeviceId: managedDevice.id, displayId: managedDevice.displayId, credentialId, deviceToken: token, enrollmentStatus: managedDevice.enrollmentStatus }, reply)
})

app.get('/api/deviceos/state', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const targets = await prisma.deploymentTarget.findMany({ where: { managedDeviceId: device.id, campaign: { application: { allowed: true } }, state: { in: ['PENDING', 'ASSIGNED', 'DOWNLOADING', 'DOWNLOADED', 'VERIFIED', 'INSTALLING', 'PENDING_USER_ACTION', 'INSTALLED', 'HEALTH_CHECK', 'FAILED', 'RETRY_WAIT'] } }, include: { campaign: { include: { application: { select: { id: true, packageName: true, displayName: true } }, release: { select: { id: true, packageName: true, versionCode: true, versionName: true, minSdk: true, targetSdk: true, sha256: true, certificateSha256: true, sizeBytes: true } } } } }, orderBy: { createdAt: 'asc' }, take: 20 })
  const deviceTargets = targets.map((target) => ({
    id: target.id,
    state: target.state,
    attemptCount: target.attemptCount,
    nextAttemptAt: target.nextAttemptAt,
    campaign: {
      id: target.campaign.id,
      name: target.campaign.name,
      state: target.campaign.state,
      maintenanceWindowStart: target.campaign.maintenanceWindowStart,
      maintenanceWindowEnd: target.campaign.maintenanceWindowEnd,
      application: target.campaign.application,
      release: target.campaign.release,
    },
  }))
  return ok(request, asDeviceOsJson({ managedDeviceId: device.id, displayId: device.displayId, enrollmentStatus: device.enrollmentStatus, desiredStateVersion: device.desiredStateVersion, targets: deviceTargets }), reply)
})

app.post('/api/deviceos/heartbeat', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const input = bodyOf(request, z.object({
    requestId: deviceRequestId,
    agentVersionName: z.string().max(80).optional(),
    agentVersionCode: z.coerce.bigint().nonnegative().optional(),
    androidVersion: z.string().max(80).optional(),
    manufacturer: z.string().max(120).optional(),
    model: z.string().max(120).optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
    inventory: z.array(z.object({ packageName: z.string().min(1).max(255), versionCode: z.coerce.bigint().nonnegative(), versionName: z.string().max(255).optional(), certificateSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), installSource: z.string().max(80).optional(), metadata: z.record(z.string(), z.unknown()).optional() })).max(500).default([]),
    telemetry: z.record(z.string(), z.unknown()).optional(),
  }))
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const isNewRequest = await consumeDeviceRequest(tx, device.id, input.requestId, '/api/deviceos/heartbeat')
    if (!isNewRequest) return { replayed: true, device: { id: device.id, desiredStateVersion: device.desiredStateVersion } }
    const current = await tx.managedDevice.findUnique({ where: { id: device.id } })
    if (!current || current.revokedAt || current.enrollmentStatus === 'REVOKED') throw unauthorized('DeviceOS device is revoked')
    const result = await tx.managedDevice.update({ where: { id: device.id, rowVersion: current.rowVersion }, data: { lastSeenAt: now, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: { ...(input.capabilities ?? {}), telemetry: input.telemetry ?? {} } as any, rowVersion: { increment: 1 } } })
    for (const item of input.inventory) {
      const app = await tx.managedApplication.findUnique({ where: { packageName: item.packageName }, select: { id: true, allowed: true, releases: { where: { approvalStatus: 'APPROVED' }, orderBy: { versionCode: 'desc' }, take: 1, select: { versionCode: true, certificateSha256: true } } } })
      const latestRelease = app?.releases[0]
      const isCompliant = Boolean(app?.allowed && latestRelease && item.versionCode >= latestRelease.versionCode && item.certificateSha256?.toLowerCase() === latestRelease.certificateSha256.toLowerCase())
      await tx.deviceApplicationInventory.upsert({ where: { managedDeviceId_packageName: { managedDeviceId: device.id, packageName: item.packageName } }, create: { managedDeviceId: device.id, applicationId: app?.id, packageName: item.packageName, versionCode: item.versionCode, versionName: item.versionName, certificateSha256: item.certificateSha256?.toLowerCase(), installSource: item.installSource, isCompliant, metadata: item.metadata as any }, update: { applicationId: app?.id, versionCode: item.versionCode, versionName: item.versionName, certificateSha256: item.certificateSha256?.toLowerCase(), installSource: item.installSource, isCompliant, metadata: item.metadata as any, lastSeenAt: now } })
    }
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_HEARTBEAT', entityType: 'ManagedDevice', entityId: device.id, after: { inventoryCount: input.inventory.length, receivedAt: now.toISOString() } as any, requestId: request.id } })
    return { replayed: false, device: result }
  }).catch((error) => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new ApiError('DEVICE_STATE_CONFLICT', 'Device state changed concurrently; retry heartbeat', 409); throw error })
  return ok(request, asDeviceOsJson({ accepted: true, replayed: updated.replayed, managedDeviceId: updated.device.id, desiredStateVersion: updated.device.desiredStateVersion, serverTime: now }), reply)
})

app.post('/api/deviceos/revoke', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.managedDevice.update({ where: { id: device.id }, data: { enrollmentStatus: 'REVOKED', revokedAt: now, rowVersion: { increment: 1 } } })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_SELF_REVOCATION', entityType: 'ManagedDevice', entityId: device.id, requestId: request.id } })
  })
  return ok(request, { revoked: true }, reply)
})

app.post('/api/deviceos/rotate-credential', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const input = bodyOf(request, z.object({ requestId: deviceRequestId }))
  const token = randomSecret()
  const credentialId = randomUUID()
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    const isNewRequest = await consumeDeviceRequest(tx, device.id, input.requestId, '/api/deviceos/rotate-credential')
    if (!isNewRequest) throw new ApiError('DEVICE_REQUEST_REPLAYED', 'Credential rotation request was already processed', 409)
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_CREDENTIAL_ROTATED', entityType: 'DeviceCredential', entityId: credentialId, after: { credentialId, initiatedBy: 'DEVICE' } as any, requestId: request.id } })
  })
  return ok(request, { managedDeviceId: device.id, credentialId, deviceToken: token, rotatedAt: now }, reply)
})

app.get('/api/deviceos/storage', async (request, reply) => {
  if (config.deviceOsStorageMode === 's3') throw notFound('APK release not found')
  const query = request.query as { key?: string; expires?: string; signature?: string }
  const key = query.key ?? ''
  const expires = Number(query.expires)
  if (!key || !verifyLocalDownloadSignature(key, expires, query.signature ?? '')) throw forbidden('Signed APK URL is invalid or expired')
  const content = await deviceOsStorage().get(key).catch(() => null)
  if (!content) throw notFound('APK release not found')
  return sendDeviceOsApk(request, reply, content)
})

app.get('/api/admin/deviceos/devices', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const devices = await prisma.managedDevice.findMany({ include: { display: { select: { id: true, name: true, deviceId: true, state: true, vehicle: { select: { registrationNumber: true, city: true } } } }, _count: { select: { inventory: true, deploymentTargets: true } } }, orderBy: { updatedAt: 'desc' } })
  return ok(request, asDeviceOsJson(devices), reply)
})

app.get('/api/admin/deviceos/devices/:managedDeviceId/inventory', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId }, select: { id: true } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  const inventory = await prisma.deviceApplicationInventory.findMany({ where: { managedDeviceId }, include: { application: { select: { displayName: true, packageName: true } } }, orderBy: { packageName: 'asc' } })
  return ok(request, asDeviceOsJson(inventory), reply)
})

app.get('/api/admin/deviceos/telemetry', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const devices = await prisma.managedDevice.findMany({ select: { id: true, displayId: true, enrollmentStatus: true, lastSeenAt: true, capabilities: true, display: { select: { name: true, deviceId: true } } }, orderBy: { lastSeenAt: 'desc' } })
  return ok(request, asDeviceOsJson(devices.map((device) => ({ ...device, telemetry: (device.capabilities as Record<string, unknown> | null)?.telemetry ?? {} }))), reply)
})

app.get('/api/admin/deviceos/audit-logs', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const query = request.query as { limit?: string }
  const limit = Math.min(Math.max(Number(query.limit ?? 200) || 200, 1), 500)
  const events = await prisma.deviceOsAuditEvent.findMany({ take: limit, orderBy: { createdAt: 'desc' }, include: { managedDevice: { select: { display: { select: { name: true, deviceId: true } } } }, campaign: { select: { name: true } } } })
  return ok(request, asDeviceOsJson(events), reply)
})

app.post('/api/admin/deviceos/devices/:managedDeviceId/revoke', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.managedDevice.update({ where: { id: device.id }, data: { enrollmentStatus: 'REVOKED', revokedAt: now, rowVersion: { increment: 1 } } })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, actorId: auth.userId, actorRole: auth.role, action: 'DEVICE_REVOKED', entityType: 'ManagedDevice', entityId: device.id, before: { enrollmentStatus: device.enrollmentStatus } as any, after: { enrollmentStatus: 'REVOKED' } as any, requestId: request.id } })
    return row
  })
  return ok(request, asDeviceOsJson(updated), reply)
})

app.post('/api/admin/deviceos/devices/:managedDeviceId/rotate-credential', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  if (device.revokedAt || device.enrollmentStatus === 'REVOKED') throw new ApiError('DEVICE_REVOKED', 'Revoked DeviceOS credentials cannot be rotated', 409)
  const token = randomSecret()
  const credentialId = randomUUID()
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, actorId: auth.userId, actorRole: auth.role, action: 'DEVICE_CREDENTIAL_ROTATED', entityType: 'DeviceCredential', entityId: credentialId, after: { credentialId } as any, requestId: request.id } })
  })
  return ok(request, { managedDeviceId: device.id, credentialId, deviceToken: token, rotatedAt: now }, reply)
})

app.get('/api/admin/deviceos/applications', async (request, reply) => {
  await requirePermission(request, 'device:read')
  return ok(request, asDeviceOsJson(await prisma.managedApplication.findMany({ include: { _count: { select: { releases: true, inventory: true } } }, orderBy: { updatedAt: 'desc' } })), reply)
})

app.post('/api/admin/deviceos/applications', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const input = bodyOf(request, z.object({ packageName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+$/), displayName: z.string().trim().min(1).max(160) }))
  let application
  try {
    application = await prisma.managedApplication.create({ data: input })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError('APPLICATION_ALREADY_REGISTERED', 'An application with this package name is already registered', 409)
    throw error
  }
  await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'APPLICATION_REGISTERED', entityType: 'ManagedApplication', entityId: application.id, after: input as any, requestId: request.id } })
  return ok(request, application, reply)
})

app.post('/api/admin/deviceos/applications/:applicationId/allowlist', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { applicationId } = request.params as { applicationId: string }
  const input = bodyOf(request, z.object({ allowed: z.boolean() }))
  const application = await prisma.managedApplication.findUnique({ where: { id: applicationId } })
  if (!application) throw notFound('Managed application not found')
  if (application.allowed === input.allowed) return ok(request, application, reply)
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.managedApplication.update({ where: { id: applicationId }, data: { allowed: input.allowed } })
    await tx.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: input.allowed ? 'APPLICATION_ALLOWLISTED' : 'APPLICATION_BLOCKED', entityType: 'ManagedApplication', entityId: applicationId, before: { allowed: application.allowed } as any, after: { allowed: input.allowed } as any, requestId: request.id } })
    return next
  })
  return ok(request, updated, reply)
})

app.get('/api/admin/deviceos/applications/:applicationId/releases', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const { applicationId } = request.params as { applicationId: string }
  const releases = await prisma.applicationRelease.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' } })
  return ok(request, asDeviceOsJson(releases), reply)
})

app.post('/api/admin/deviceos/applications/:applicationId/releases', { bodyLimit: deviceOsUploadBodyLimit }, async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { applicationId } = request.params as { applicationId: string }
  const application = await prisma.managedApplication.findUnique({ where: { id: applicationId } })
  if (!application) throw notFound('Managed application not found')
  const input = bodyOf(request, z.object({ apkBase64: z.string().min(1), metadata: z.record(z.string(), z.unknown()).optional() }))
  const content = decodeApkBase64(input.apkBase64)
  const metadata = await inspectApk(content)
  if (metadata.packageName !== application.packageName) throw new ApiError('APK_PACKAGE_MISMATCH', `APK package ${metadata.packageName} does not match registered application ${application.packageName}`, 422)
  const duplicate = await prisma.applicationRelease.findFirst({ where: { applicationId, versionCode: metadata.versionCode, sha256: metadata.sha256 } })
  if (duplicate) return ok(request, { duplicate: true, release: asDeviceOsJson(duplicate) }, reply)
  const previousRelease = await prisma.applicationRelease.findFirst({ where: { applicationId }, orderBy: { createdAt: 'desc' }, select: { certificateSha256: true } })
  assertSigningCertificateContinuity(previousRelease?.certificateSha256, metadata.certificateSha256)
  const storageKey = `deviceos/${applicationId}/${metadata.versionCode.toString()}-${metadata.sha256}.apk`
  try { await deviceOsStorage().put(storageKey, content) } catch (error) { throw new ApiError('APK_STORAGE_UNAVAILABLE', error instanceof Error && error.message === 'DEVICEOS_S3_NOT_CONFIGURED' ? 'Private DeviceOS storage is not configured' : 'APK could not be stored', 503) }
  let releaseCreated = false
  try {
    const release = await prisma.applicationRelease.create({ data: { applicationId, packageName: metadata.packageName, versionCode: metadata.versionCode, versionName: metadata.versionName, minSdk: metadata.minSdk, targetSdk: metadata.targetSdk, sha256: metadata.sha256, certificateSha256: metadata.certificateSha256, storageKey, sizeBytes: metadata.sizeBytes, metadata: { ...(input.metadata ?? {}), label: metadata.label } as any } })
    releaseCreated = true
    await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'RELEASE_REGISTERED', entityType: 'ApplicationRelease', entityId: release.id, after: { applicationId, packageName: metadata.packageName, versionCode: metadata.versionCode.toString(), sha256: metadata.sha256, certificateSha256: metadata.certificateSha256 } as any, requestId: request.id } })
    return ok(request, asDeviceOsJson(release), reply)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.applicationRelease.findFirst({ where: { applicationId, versionCode: metadata.versionCode, sha256: metadata.sha256 } })
      if (existing) return ok(request, { duplicate: true, release: asDeviceOsJson(existing) }, reply)
      throw new ApiError('DUPLICATE_RELEASE', 'An identical immutable release already exists', 409)
    }
    if (!releaseCreated) await deviceOsStorage().delete(storageKey).catch(() => undefined)
    throw error
  }
})

app.post('/api/admin/deviceos/releases/:releaseId/approve', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { releaseId } = request.params as { releaseId: string }
  const release = await prisma.applicationRelease.findUnique({ where: { id: releaseId } })
  if (!release) throw notFound('Application release not found')
  if (release.approvalStatus === 'APPROVED') return ok(request, asDeviceOsJson(release), reply)
  if (release.approvalStatus !== 'DRAFT') throw new ApiError('RELEASE_NOT_APPROVABLE', `Release is ${release.approvalStatus}`, 409)
  const approved = await prisma.applicationRelease.update({ where: { id: release.id }, data: { approvalStatus: 'APPROVED', approvedBy: auth.userId, approvedAt: new Date() } })
  await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'RELEASE_APPROVED', entityType: 'ApplicationRelease', entityId: release.id, before: { approvalStatus: release.approvalStatus } as any, after: { approvalStatus: approved.approvalStatus, approvedBy: auth.userId } as any, requestId: request.id } })
  return ok(request, asDeviceOsJson(approved), reply)
})

app.get('/api/deviceos/releases/:releaseId/download', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { releaseId } = request.params as { releaseId: string }
  const target = await prisma.deploymentTarget.findFirst({ where: { managedDeviceId: device.id, campaign: { releaseId, state: { in: ['ACTIVE', 'PAUSED'] }, application: { allowed: true } }, state: { in: ['ASSIGNED', 'DOWNLOADING', 'RETRY_WAIT'] } }, include: { campaign: { include: { release: true } } } })
  if (!target || target.campaign.release.approvalStatus !== 'APPROVED') throw forbidden('Release is not assigned to this device')
  if (target.campaign.release.packageName === 'com.ooro.screenplayer' && !isWithinMaintenanceWindow(new Date(), target.campaign.maintenanceWindowStart, target.campaign.maintenanceWindowEnd)) throw new ApiError('MAINTENANCE_WINDOW_CLOSED', 'Screen Player updates are outside the approved maintenance window', 409)
  const content = await deviceOsStorage().get(target.campaign.release.storageKey).catch(() => null)
  if (!content) throw notFound('APK release not found')
  return sendDeviceOsApk(request, reply, content, `${target.campaign.release.packageName}-${target.campaign.release.versionName}.apk`)
})

app.get('/api/deviceos/releases/:releaseId/download-url', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { releaseId } = request.params as { releaseId: string }
  const target = await prisma.deploymentTarget.findFirst({ where: { managedDeviceId: device.id, campaign: { releaseId, state: 'ACTIVE', application: { allowed: true } }, state: { in: ['ASSIGNED', 'DOWNLOADING', 'RETRY_WAIT'] } }, include: { campaign: { include: { release: true } } } })
  if (!target || target.campaign.release.approvalStatus !== 'APPROVED') throw forbidden('Release is not assigned to this device')
  if (target.campaign.release.packageName === 'com.ooro.screenplayer' && !isWithinMaintenanceWindow(new Date(), target.campaign.maintenanceWindowStart, target.campaign.maintenanceWindowEnd)) throw new ApiError('MAINTENANCE_WINDOW_CLOSED', 'Screen Player updates are outside the approved maintenance window', 409)
  const url = await deviceOsStorage().signedDownloadUrl(target.campaign.release.storageKey, 300)
  return ok(request, { url, expiresInSeconds: 300, releaseId }, reply)
})

app.post('/api/deviceos/targets/:targetId/events', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { targetId } = request.params as { targetId: string }
  const input = bodyOf(request, z.object({ state: z.string(), installerSessionId: z.string().max(120).optional(), bytesDownloaded: z.coerce.bigint().nonnegative().optional(), checksumVerified: z.boolean().optional(), installerStatus: z.string().max(120).optional(), installerMessage: z.string().max(1000).optional(), installedVersionCode: z.coerce.bigint().nonnegative().optional(), installedVersionName: z.string().max(255).optional(), installedCertificateSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), healthStatus: z.string().max(80).optional(), errorCode: z.string().max(120).optional(), errorMessage: z.string().max(1000).optional(), idempotencyKey: z.string().min(8).max(200) }))
  const target = await prisma.deploymentTarget.findFirst({ where: { id: targetId, managedDeviceId: device.id }, include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 }, campaign: { include: { release: true } } } })
  if (!target) throw notFound('Deployment target not found')
  if (input.state === 'HEALTHY' && !isHealthyInstallationReportValid({ installedVersionCode: input.installedVersionCode, targetVersionCode: target.campaign.release.versionCode, installedCertificateSha256: input.installedCertificateSha256, releaseCertificateSha256: target.campaign.release.certificateSha256, healthStatus: input.healthStatus })) throw new ApiError('INVALID_HEALTH_REPORT', 'Healthy installation reports must include a compatible version and signing certificate', 422)
  const currentState = target.state
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.deviceOsAuditEvent.findFirst({ where: { managedDeviceId: device.id, idempotencyKey: input.idempotencyKey } })
    if (existingEvent) {
      const previousState = existingEvent.after && typeof existingEvent.after === 'object' && !Array.isArray(existingEvent.after) ? (existingEvent.after as Record<string, unknown>).reportedState : undefined
      validateDeviceOsEventTransition({ currentState, reportedState: input.state, campaignPaused: target.campaign.state === 'PAUSED', existingReportedState: previousState as string | undefined })
      return tx.deploymentTarget.findUniqueOrThrow({ where: { id: target.id } })
    }
    validateDeviceOsEventTransition({ currentState, reportedState: input.state, campaignPaused: target.campaign.state === 'PAUSED' })
    const retryLimit = 3
    const scheduleRetry = input.state === 'FAILED' && target.campaign.state === 'ACTIVE' && target.attemptCount < retryLimit - 1
    const persistedState = scheduleRetry ? 'RETRY_WAIT' : input.state
    const nextAttemptAt = scheduleRetry ? new Date(now.getTime() + retryDelayMs(target.attemptCount)) : undefined
    const row = await tx.deploymentTarget.updateMany({ where: { id: target.id, managedDeviceId: device.id, rowVersion: target.rowVersion }, data: { state: persistedState, rowVersion: { increment: 1 }, ...(scheduleRetry ? { attemptCount: { increment: 1 }, nextAttemptAt } : {}), ...(['HEALTHY', 'CANCELLED', 'QUARANTINED', 'FAILED'].includes(persistedState) ? { completedAt: now } : {}), lastErrorCode: input.errorCode, lastErrorMessage: input.errorMessage } })
    if (row.count !== 1) throw new ApiError('DEPLOYMENT_STATE_CONFLICT', 'Deployment target changed concurrently; retry the event', 409)
    const attempt = target.attempts[0]
    if (attempt) await tx.deploymentAttempt.update({ where: { id: attempt.id }, data: { state: input.state, installerSessionId: input.installerSessionId, bytesDownloaded: input.bytesDownloaded, checksumVerified: input.checksumVerified ?? attempt.checksumVerified, ...(input.state === 'DOWNLOADING' ? { startedAt: now } : {}), ...(['HEALTHY', 'FAILED', 'QUARANTINED', 'CANCELLED'].includes(input.state) ? { completedAt: now } : {}), errorCode: input.errorCode, errorMessage: input.errorMessage } })
    if (scheduleRetry && attempt) await tx.deploymentAttempt.create({ data: { targetId: target.id, managedDeviceId: device.id, attemptNumber: attempt.attemptNumber + 1, state: 'RETRY_WAIT', idempotencyKey: `${target.campaignId}:${device.id}:${attempt.attemptNumber + 1}` } })
    if (input.installerStatus || input.installedVersionCode != null || input.healthStatus) {
      if (!attempt) throw new ApiError('DEPLOYMENT_ATTEMPT_MISSING', 'Deployment attempt is missing', 409)
      await tx.installationResult.upsert({ where: { attemptId: attempt.id }, create: { attemptId: attempt.id, managedDeviceId: device.id, packageName: target.campaign.release.packageName, installedVersionCode: input.installedVersionCode, installedVersionName: input.installedVersionName, installerStatus: input.installerStatus ?? input.state, installerMessage: input.installerMessage, healthStatus: input.healthStatus, healthyAt: input.healthStatus === 'HEALTHY' ? now : undefined }, update: { installedVersionCode: input.installedVersionCode, installedVersionName: input.installedVersionName, installerStatus: input.installerStatus ?? input.state, installerMessage: input.installerMessage, healthStatus: input.healthStatus, healthyAt: input.healthStatus === 'HEALTHY' ? now : undefined, reportedAt: now } })
    }
    const [grouped, healthFailureCount] = await Promise.all([
      tx.deploymentTarget.groupBy({ by: ['state'], where: { campaignId: target.campaignId }, _count: { _all: true } }),
      tx.installationResult.count({ where: { healthStatus: 'FAILED', attempt: { target: { campaignId: target.campaignId } } } }),
    ])
    const snapshot = grouped.reduce((result, row) => {
      result.total += row._count._all
      if (row.state === 'HEALTHY') result.healthy += row._count._all
      if (row.state === 'FAILED') result.failed += row._count._all
      if (row.state === 'QUARANTINED') result.quarantined += row._count._all
      return result
    }, { total: 0, healthy: 0, failed: 0, quarantined: 0, healthFailures: healthFailureCount })
    const gate = campaignHealthGate(snapshot, { maxFailureRatePercent: target.campaign.maxFailureRatePercent, healthGate: target.campaign.healthGate as Record<string, unknown> | null })
    if (gate.pause && target.campaign.state === 'ACTIVE') {
      await tx.deploymentCampaign.update({ where: { id: target.campaignId }, data: { state: 'PAUSED', pausedAt: now, pauseReason: gate.reason } })
      await tx.deploymentTarget.updateMany({ where: { campaignId: target.campaignId, state: { in: ['PENDING', 'ASSIGNED', 'RETRY_WAIT'] } }, data: { state: 'PAUSED', rowVersion: { increment: 1 } } })
      await tx.managedDevice.updateMany({ where: { deploymentTargets: { some: { campaignId: target.campaignId } } }, data: { desiredStateVersion: { increment: 1 } } })
      await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, campaignId: target.campaignId, action: 'DEPLOYMENT_HEALTH_GATE_PAUSED', entityType: 'DeploymentCampaign', entityId: target.campaignId, after: { reason: gate.reason, snapshot } as any, requestId: request.id } })
    }
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, campaignId: target.campaignId, action: 'DEPLOYMENT_STATE_REPORTED', entityType: 'DeploymentTarget', entityId: target.id, idempotencyKey: input.idempotencyKey, after: { from: currentState, reportedState: input.state, persistedState, retryScheduled: scheduleRetry, installerStatus: input.installerStatus, errorCode: input.errorCode } as any, requestId: request.id } })
    return tx.deploymentTarget.findUniqueOrThrow({ where: { id: target.id } })
  })
  return ok(request, asDeviceOsJson(updated), reply)
})

app.post('/api/admin/deviceos/deployments', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const input = bodyOf(request, z.object({
    name: z.string().trim().min(1).max(160),
    applicationId: z.string().uuid(),
    releaseId: z.string().uuid(),
    targetingMode: z.enum(deploymentTargetingModes),
    deviceIds: z.array(z.string().uuid()).max(5000).optional(),
    groupId: z.string().uuid().optional(),
    city: z.string().trim().max(120).optional(),
    targetPercentage: z.number().int().min(1).max(100).optional(),
    maintenanceWindowStart: z.coerce.date().optional(),
    maintenanceWindowEnd: z.coerce.date().optional(),
    maxFailureRatePercent: z.number().int().min(0).max(100).optional(),
    healthGate: z.record(z.string(), z.unknown()).optional(),
  }))
  const headerKey = request.headers['idempotency-key']
  const idempotencyKey = typeof headerKey === 'string' ? headerKey.trim() : undefined
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 200)) throw new ApiError('IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key must be between 8 and 200 characters', 422)
  const result = await createDeviceOsCampaign(prisma, { ...input, idempotencyKey, createdBy: auth.userId })
  return ok(request, asDeviceOsJson(result), reply)
})

app.get('/api/admin/deviceos/deployments', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const campaigns = await prisma.deploymentCampaign.findMany({ include: { application: true, release: true, _count: { select: { targets: true } }, targets: { select: { state: true } } }, orderBy: { createdAt: 'desc' } })
  const summarized = campaigns.map(({ targets, ...campaign }) => ({ ...campaign, targetSummary: targets.reduce<Record<string, number>>((summary, target) => { summary[target.state] = (summary[target.state] ?? 0) + 1; return summary }, {}) }))
  return ok(request, asDeviceOsJson(summarized), reply)
})

app.get('/api/admin/deviceos/deployments/:campaignId', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const { campaignId } = request.params as { campaignId: string }
  const campaign = await prisma.deploymentCampaign.findUnique({
    where: { id: campaignId },
    include: {
      application: true,
      release: true,
      targets: {
        include: {
          managedDevice: { include: { display: { select: { id: true, name: true, deviceId: true } } } },
          attempts: { include: { installationResult: true }, orderBy: { attemptNumber: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!campaign) throw notFound('Deployment campaign not found')
  return ok(request, asDeviceOsJson(campaign), reply)
})

app.post('/api/admin/deviceos/deployments/:campaignId/pause', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { campaignId } = request.params as { campaignId: string }
  const input = bodyOf(request, z.object({ reason: z.string().trim().min(1).max(500) }))
  return ok(request, asDeviceOsJson(await pauseDeviceOsCampaign(prisma, campaignId, input.reason, auth.userId, auth.role)), reply)
})

app.post('/api/admin/deviceos/deployments/:campaignId/resume', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const { campaignId } = request.params as { campaignId: string }
  return ok(request, asDeviceOsJson(await resumeDeviceOsCampaign(prisma, campaignId, auth.userId, auth.role)), reply)
})
app.post('/api/device/heartbeat', async (request, reply) => {
  const display = await authenticateDisplay(request)
  const coordinate = (value: number | undefined, min: number, max: number) => value === undefined ? undefined : Number.isFinite(value) && value >= min && value <= max ? value : undefined
  const input = bodyOf(request, z.object({ timestamp: z.coerce.date().optional(), appVersion: z.string().optional(), deviceVersion: z.string().optional(), androidVersion: z.string().optional(), manufacturer: z.string().optional(), model: z.string().optional(), storageFree: z.coerce.bigint().optional(), storageTotal: z.coerce.bigint().optional(), networkType: z.string().optional(), networkConnected: z.boolean().optional(), manifestVersion: z.number().int().optional(), currentCampaignId: z.string().optional(), currentCreativeId: z.string().optional(), currentAssetId: z.string().optional(), playbackState: z.enum(['IDLE', 'LOADING', 'PLAYING', 'PAUSED', 'FAILED', 'READY', 'DEGRADED', 'OFFLINE_PLAYBACK']).optional(), screenState: z.string().optional(), playbackStartedAt: z.coerce.date().optional(), playbackPositionMs: z.number().finite().int().nonnegative().optional(), expectedDurationMs: z.number().finite().int().nonnegative().optional(), latitude: z.number().finite().optional(), longitude: z.number().finite().optional(), accuracyMeters: z.number().finite().nonnegative().optional(), speedMps: z.number().finite().nonnegative().optional(), headingDegrees: z.number().finite().optional(), locationOccurredAt: z.coerce.date().optional(), batteryLevel: z.number().int().min(0).max(100).optional(), chargingState: z.string().optional(), temperature: z.number().finite().optional() }))
  const latitude = coordinate(input.latitude, -90, 90); const longitude = coordinate(input.longitude, -180, 180)
  const locationCandidate = { latitude, longitude, accuracyMeters: input.accuracyMeters, occurredAt: input.locationOccurredAt ?? input.timestamp ?? new Date() }
  const hasLocation = latitude !== undefined && longitude !== undefined && validDisplayLocation(locationCandidate)
  const occurredAt = input.timestamp ?? new Date(); const locationOccurredAt = hasLocation ? (input.locationOccurredAt ?? occurredAt) : undefined
  const previousLocation = await prisma.displayLocationEvent.findFirst({ where: { displayId: display.id }, orderBy: { occurredAt: 'desc' } })
  const movedEnough = hasLocation && shouldRecordDisplayLocation(previousLocation ? { latitude: previousLocation.latitude, longitude: previousLocation.longitude, accuracyMeters: previousLocation.accuracyMeters, occurredAt: previousLocation.occurredAt } : null, { latitude: latitude!, longitude: longitude!, accuracyMeters: input.accuracyMeters!, occurredAt: locationOccurredAt! })
  const { timestamp: _timestamp, latitude: _lat, longitude: _lng, accuracyMeters: _accuracy, speedMps: _speed, headingDegrees: _heading, locationOccurredAt: _locationAt, ...heartbeat } = input
  const hb = await prisma.$transaction(async (tx) => {
    const row = await tx.displayHeartbeat.create({ data: { displayId: display.id, occurredAt, ...heartbeat, latitude, longitude, accuracyMeters: hasLocation ? input.accuracyMeters : undefined, speedMps: input.speedMps, headingDegrees: input.headingDegrees, locationOccurredAt } as any })
    if (hasLocation && movedEnough) await tx.displayLocationEvent.create({ data: { displayId: display.id, latitude: latitude!, longitude: longitude!, accuracyMeters: input.accuracyMeters!, speedMps: input.speedMps, headingDegrees: input.headingDegrees, occurredAt: locationOccurredAt! } })
    if (input.playbackState && ['PLAYING', 'FAILED'].includes(input.playbackState) && input.playbackState !== display.currentPlaybackState) {
      const playbackLocation = hasLocation ? { latitude, longitude, locationAccuracy: input.accuracyMeters, locationOccurredAt } : previousLocation ? { latitude: previousLocation.latitude, longitude: previousLocation.longitude, locationAccuracy: previousLocation.accuracyMeters, locationOccurredAt: previousLocation.occurredAt } : {}
      await tx.playbackEvent.create({ data: { eventId: randomSecret(16), displayId: display.id, campaignId: input.currentCampaignId, creativeId: input.currentCreativeId, assetId: input.currentAssetId, eventType: input.playbackState === 'PLAYING' ? 'PLAY_STARTED' : 'PLAY_FAILED', occurredAt: input.playbackStartedAt ?? occurredAt, position: input.playbackPositionMs, duration: input.expectedDurationMs, manifestVersion: input.manifestVersion, playerVersion: input.appVersion, errorCode: input.playbackState === 'FAILED' ? 'DEVICE_PLAYBACK_FAILED' : undefined, ...playbackLocation } as any })
    }
    await tx.display.update({ where: { id: display.id }, data: { appVersion: input.appVersion, manifestVersion: input.manifestVersion, state: ['DISABLED','BLOCKED','MAINTENANCE'].includes(display.state) ? display.state : input.screenState ?? input.playbackState ?? 'READY', lastHeartbeatAt: new Date(), ...(hasLocation ? { lastLatitude: latitude, lastLongitude: longitude, lastLocationAccuracy: input.accuracyMeters, lastLocationAt: locationOccurredAt } : {}), currentCampaignId: input.currentCampaignId, currentCreativeId: input.currentCreativeId, currentAssetId: input.currentAssetId, currentPlaybackState: input.playbackState, currentPlaybackStartedAt: input.playbackStartedAt, currentPlaybackPositionMs: input.playbackPositionMs, currentExpectedDurationMs: input.expectedDurationMs, manufacturer: input.manufacturer, model: input.model, androidVersion: input.androidVersion ?? input.deviceVersion, batteryLevel: input.batteryLevel, chargingState: input.chargingState, lastNetworkType: input.networkType } })
    return row
  })
  const latest = await buildDisplayManifest(display.id); if (latest.manifest.version !== (input.manifestVersion ?? -1)) { try { await prisma.$transaction(async (tx) => { const pending = await tx.displayCommand.findFirst({ where: { displayId: display.id, commandType: { in: ['REFRESH_MANIFEST', 'SYNC_MANIFEST'] }, status: { in: ['QUEUED', 'DELIVERED'] } }, select: { id: true } }); if (!pending) await tx.displayCommand.create({ data: { displayId: display.id, commandType: 'REFRESH_MANIFEST', payload: { manifestVersion: latest.manifest.version }, expiresAt: null } }); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error } }
  const commands = await prisma.displayCommand.findMany({ where: { displayId: display.id, status: 'QUEUED', OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: 'asc' }, take: 20, select: { id: true, commandType: true, payload: true, expiresAt: true } })
  return ok(request, { accepted: true, heartbeatId: hb.id, serverTime: new Date(), currentManifestVersion: latest.manifest.version, manifestUpdateAvailable: latest.manifest.version !== (input.manifestVersion ?? -1), commands: asJson(commands) }, reply)
})
app.get('/api/device/manifest', async (request, reply) => { const display = await authenticateDisplay(request); const { manifest, reasons } = await buildDisplayManifest(display.id); request.log.info({ displayId: display.id, reasons, itemCount: manifest.items.length }, 'display manifest evaluated'); return ok(request, { version: manifest.version, manifestId: manifest.manifestId, screenId: display.id, generatedAt: manifest.generatedAt, validUntil: manifest.expiresAt, timezone: 'Asia/Kolkata', layout: manifest.layout, news: manifest.news, items: manifest.items }, reply) })
app.get('/api/admin/displays/:displayId/manifest-debug', async (request, reply) => { await requirePermission(request, 'device:read'); const { displayId } = request.params as { displayId: string }; const { manifest, reasons } = await buildDisplayManifest(displayId); return ok(request, { displayId, reasons, selected: manifest.items, manifestVersion: manifest.version }, reply) })
app.get('/api/device/commands', async (request, reply) => { const display = await authenticateDisplay(request); const now = new Date(); await prisma.displayCommand.updateMany({ where: { displayId: display.id, status: 'QUEUED', expiresAt: { lt: now } }, data: { status: 'FAILED', failedAt: now, error: 'EXPIRED' } }); const commands = await prisma.displayCommand.findMany({ where: { displayId: display.id, status: 'QUEUED', OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }, orderBy: { createdAt: 'asc' }, take: 20 }); if (commands.length) { const deliveredAt = new Date(); await prisma.displayCommand.updateMany({ where: { id: { in: commands.map((c) => c.id) } }, data: { status: 'DELIVERED', deliveredAt } }); commands.forEach((command) => { command.status = 'DELIVERED'; command.deliveredAt = deliveredAt }); } return ok(request, asJson(commands), reply) })
app.post('/api/device/commands/:commandId/ack', async (request, reply) => { const display = await authenticateDisplay(request); const { commandId } = request.params as { commandId: string }; const input = bodyOf(request, z.object({ status: z.enum(['RECEIVED','PROCESSING','SUCCEEDED','FAILED','UNSUPPORTED']), receivedAt: z.coerce.date().optional(), startedAt: z.coerce.date().optional(), completedAt: z.coerce.date().optional(), errorCode: z.string().optional(), errorMessage: z.string().optional() })); const command = await prisma.displayCommand.findFirst({ where: { id: commandId, displayId: display.id } }); if (!command) throw notFound('Command not found'); const terminal = ['SUCCEEDED', 'FAILED', 'UNSUPPORTED'].includes(input.status); return ok(request, await prisma.displayCommand.update({ where: { id: commandId }, data: { status: input.status, acknowledgedAt: terminal || input.status === 'RECEIVED' || input.status === 'PROCESSING' ? new Date() : command.acknowledgedAt, failedAt: input.status === 'FAILED' ? new Date() : undefined, error: input.errorMessage } }), reply) })
app.post('/api/device/unpair', async (request, reply) => { const display = await authenticateDisplay(request); await prisma.display.update({ where: { id: display.id }, data: { deviceTokenHash: null, state: 'UNPAIRED' } }); return ok(request, { unpaired: true }, reply) })

const eventSchema = z.object({ eventId: z.string().min(4), provider: z.string(), eventType: z.string(), timestamp: z.coerce.date().optional(), occurredAt: z.coerce.date().optional(), confidence: z.number().min(0).max(1).default(1), source: z.string().optional(), parserVersion: z.number().int().optional() })
async function processMobilityEvent(driver: any, event: z.infer<typeof eventSchema>, requestId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id }, orderBy: { createdAt: 'asc' } }); const display = vehicle ? await prisma.display.findFirst({ where: { vehicleId: vehicle.id } }) : null
  const occurredAt = event.occurredAt ?? event.timestamp ?? new Date()
  const recorded = await prisma.mobilityEvent.create({ data: { eventId: event.eventId, driverId: driver.id, vehicleId: vehicle?.id, provider: event.provider, eventType: event.eventType, occurredAt, confidence: event.confidence, source: event.source, parserVersion: event.parserVersion } }).catch((error: any) => error?.code === 'P2002' ? null : Promise.reject(error))
  if (!recorded) return { duplicate: true }
  let candidate: any = await prisma.rideCandidate.findFirst({ where: { driverId: driver.id, provider: event.provider, state: { in: ['TO_PICKUP','DETECTED','CONVERTED'] } }, orderBy: { lastEventAt: 'desc' }, include: { ride: true } })
  let ride: any = candidate?.ride
  if (event.eventType === 'RIDE_ACCEPTED' || event.eventType === 'RIDE_REQUESTED') {
    if (!candidate) { candidate = await prisma.rideCandidate.create({ data: { driverId: driver.id, vehicleId: vehicle?.id, displayId: display?.id, provider: event.provider, source: event.source ?? 'MOBILITY', state: 'TO_PICKUP', lastEventAt: occurredAt } }); ride = await prisma.ride.create({ data: { candidateId: candidate.id, driverId: driver.id, vehicleId: vehicle?.id, displayId: display?.id, provider: event.provider, source: event.source ?? 'MOBILITY', state: 'RIDE_ACCEPTED' } }) } }
  if (!candidate || !ride) return { event: recorded, ignored: true }
  const next = stateForEvent(ride.state, event.eventType)
  if (next) {
    assertRideTransition(ride.state, next)
    if (next === 'ACTIVE_VERIFIED') { /* server verification occurs below */ }
    await prisma.rideEvent.create({ data: { eventId: `${event.eventId}:ride`, rideId: ride.id, candidateId: candidate.id, provider: event.provider, eventType: event.eventType, occurredAt, confidence: event.confidence, source: event.source } })
    await prisma.ride.update({ where: { id: ride.id }, data: { state: next === 'ACTIVE_VERIFIED' ? 'VERIFYING' : next, startedAt: undefined } })
    await prisma.rideCandidate.update({ where: { id: candidate.id }, data: { lastEventAt: occurredAt, state: next === 'ACTIVE_VERIFIED' ? 'VERIFYING' : next } })
    if (next === 'VERIFYING' || next === 'ACTIVE_VERIFIED') await verifyAndStartSession(ride.id, driver.id, requestId)
    if (next === 'ENDING') await finishRide(ride.id, requestId)
  }
  await prisma.mobilityIntegration.upsert({ where: { driverId_provider: { driverId: driver.id, provider: event.provider } }, update: { enabled: true, lastEventAt: occurredAt, status: 'ACTIVE' }, create: { driverId: driver.id, provider: event.provider, enabled: true, lastEventAt: occurredAt, status: 'ACTIVE' } })
  return { event: recorded, rideId: ride.id, state: next ?? ride.state }
}
async function verifyAndStartSession(rideId: string, driverId: string, requestId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { events: true, locations: true, display: true } }); if (!ride || ride.state === 'CANCELLED') return
  const heartbeat = ride.displayId ? await prisma.displayHeartbeat.findFirst({ where: { displayId: ride.displayId }, orderBy: { occurredAt: 'desc' } }) : null
  const result = verifyRide({ source: ride.source, eventTypes: ride.events.map((e) => e.eventType), locationCount: ride.locations.length, displayOnline: !!heartbeat && (Date.now() - heartbeat.occurredAt.getTime()) < config.heartbeatDegradedSeconds * 1000, playbackConfirmed: false, cancellationConflict: ride.events.some((e) => e.eventType === 'RIDE_CANCELLED') })
  await prisma.rideVerification.upsert({ where: { rideId }, update: { score: result.score, status: result.status, reasons: result.reasons, verifiedAt: result.status === 'VERIFIED' ? new Date() : undefined }, create: { rideId, score: result.score, status: result.status, reasons: result.reasons, verifiedAt: result.status === 'VERIFIED' ? new Date() : undefined } })
  if (result.status !== 'VERIFIED' || ride.state === 'ACTIVE_VERIFIED') return
  await prisma.ride.update({ where: { id: rideId }, data: { state: 'ACTIVE_VERIFIED', verificationStatus: 'VERIFIED', startedAt: ride.startedAt ?? new Date() } })
  const session = await prisma.campaignSession.create({ data: { rideId, driverId, vehicleId: ride.vehicleId, displayId: ride.displayId, status: 'STARTING', startedAt: new Date() } })
  if (ride.displayId) await prisma.displayCommand.create({ data: { displayId: ride.displayId, commandType: 'START_SESSION', payload: { rideId, campaignSessionId: session.id, issuedAt: new Date().toISOString(), requestId } as any, expiresAt: new Date(Date.now() + 120000) } })
}
async function finishRide(rideId: string, requestId: string) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { campaignSessions: true, proofs: true, locations: true } }); if (!ride) return
  if (ride.displayId) await prisma.displayCommand.create({ data: { displayId: ride.displayId, commandType: 'STOP_SESSION', payload: { rideId, requestId } as any, expiresAt: new Date(Date.now() + 120000) } })
  await prisma.ride.update({ where: { id: rideId }, data: { state: 'COMPLETED', completedAt: new Date(), verificationStatus: ride.verificationStatus } })
  if (ride.campaignSessions[0]) await prisma.campaignSession.update({ where: { id: ride.campaignSessions[0].id }, data: { status: 'COMPLETED', endedAt: new Date() } })
  const validSeconds = ride.proofs.filter((p) => p.status === 'VALID').reduce((sum, p) => sum + (p.actualDuration ?? 0), 0)
  const amount = calculateEarnings(validSeconds, { baseMinor: 800n, perVerifiedAdMinuteMinor: 100n, peakBonusMinor: 0n })
  await prisma.earningEntry.create({ data: { driverId: ride.driverId, rideId, campaignSessionId: ride.campaignSessions[0]?.id, type: 'AD_EARNING', amountMinor: amount, status: 'PENDING', metadata: { validSeconds } as any } })
}
app.post('/api/mobility/events', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const input = bodyOf(request, z.object({ events: z.array(eventSchema).min(1).max(50).optional(), event: eventSchema.optional() })); const events = input.events ?? (input.event ? [input.event] : []); if (!events.length) throw new ApiError('VALIDATION_ERROR', 'At least one event is required', 422); const results = []; for (const event of events) results.push(await processMobilityEvent(driver, event, request.id)); return ok(request, results, reply) })
app.post('/api/rides/:rideId/locations', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const { rideId } = request.params as { rideId: string }; const ride = await prisma.ride.findFirst({ where: { id: rideId, driverId: driver.id } }); if (!ride) throw notFound('Ride not found'); const { points } = bodyOf(request, z.object({ points: z.array(z.object({ timestamp: z.coerce.date(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative(), speed: z.number().nonnegative().optional(), bearing: z.number().optional() })).max(500) })); await prisma.rideLocation.createMany({ data: points.map((p) => ({ rideId, occurredAt: p.timestamp, latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, speed: p.speed, bearing: p.bearing })) }); return ok(request, { accepted: points.length }, reply) })
app.get('/api/rides', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.ride.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' }, include: { verification: true, campaignSessions: true } }), reply) })
app.get('/api/rides/:rideId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { rideId } = request.params as { rideId: string }; const ride = await prisma.ride.findFirst({ where: { id: rideId, driverId: d.id }, include: { events: true, locations: true, verification: true, proofs: true, campaignSessions: true } }); if (!ride) throw notFound('Ride not found'); return ok(request, asJson(ride), reply) })

app.post('/api/playback/events', async (request, reply) => { const display = await authenticateDisplay(request); const input = bodyOf(request, z.object({ events: z.array(z.object({ eventId: z.string(), rideId: z.string().uuid().optional(), campaignSessionId: z.string().uuid().optional(), campaignId: z.string().optional(), creativeId: z.string().optional(), assetId: z.string().optional(), eventType: z.string(), timestamp: z.coerce.date().optional(), position: z.number().int().optional(), duration: z.number().int().optional(), manifestVersion: z.number().int().optional(), playerVersion: z.string().optional(), errorCode: z.string().optional() })).min(1).max(100) })); const inserted: unknown[] = []; for (const e of input.events) { const row = await prisma.playbackEvent.create({ data: { eventId: e.eventId, displayId: display.id, rideId: e.rideId, campaignSessionId: e.campaignSessionId, campaignId: e.campaignId, creativeId: e.creativeId, assetId: e.assetId, eventType: e.eventType, occurredAt: e.timestamp ?? new Date(), position: e.position, duration: e.duration, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion, errorCode: e.errorCode } }).catch((error: any) => error?.code === 'P2002' ? null : Promise.reject(error)); if (row) inserted.push(row) } return ok(request, { accepted: inserted.length }, reply) })
app.post('/api/device/proof-of-play', async (request, reply) => {
  const display = await authenticateDisplay(request)
  const input = bodyOf(request, z.object({ events: z.array(z.object({ eventId: z.string().optional(), proofId: z.string().optional(), rideId: z.string().uuid().optional(), campaignSessionId: z.string().uuid().optional(), campaignId: z.string().optional(), creativeId: z.string().optional(), assetId: z.string().optional(), scheduleItemId: z.string().optional(), playbackStartedAt: z.coerce.date().optional(), playbackEndedAt: z.coerce.date().optional(), startedAt: z.coerce.date().optional(), endedAt: z.coerce.date().optional(), expectedDuration: z.number().int().positive().optional(), actualDuration: z.number().int().nonnegative().optional(), manifestVersion: z.number().int().optional(), playerVersion: z.string().optional(), appVersion: z.string().optional(), playbackCompleted: z.boolean().optional(), success: z.boolean().optional(), failureReason: z.string().optional() })).min(1).max(100) }))
  const auditFault = process.env.OORO_INTEGRATION_TESTS === 'true' && /127\.0\.0\.1:55432\/ooro_audit/.test(process.env.DATABASE_URL ?? '') ? process.env.OORO_TEST_PROOF_FAULT : undefined
  if (auditFault === 'HTTP_500') throw new ApiError('TEST_INJECTED_PROOF_FAILURE', 'Test-only proof failure', 500)
  const partialLimit = auditFault?.match(/^PARTIAL:(\d+)$/)?.[1]
  const maxAccepted = partialLimit === undefined ? undefined : Number(partialLimit)
  let accepted = 0
  const acceptedEventIds: string[] = []
  for (const e of input.events) {
    if (maxAccepted !== undefined && accepted >= maxAccepted) break
    const started = e.playbackStartedAt ?? e.startedAt ?? new Date()
    const ended = e.playbackEndedAt ?? e.endedAt
    const actual = e.actualDuration ?? (ended ? Math.max(0, Math.round((ended.getTime() - started.getTime()) / 1000)) : undefined)
    const expected = e.expectedDuration ?? actual ?? 1
    const succeeded = e.playbackCompleted ?? e.success ?? false
    const assetId = e.assetId
    const proofId = canonicalProofId(e.proofId, e.eventId)
    if (!proofId) throw new ApiError('PROOF_ID_REQUIRED', 'Proof identity is required', 422)
    const existingProof = await prisma.proofOfPlay.findUnique({ where: { proofId }, select: { displayId: true } })
    if (!proofIdentityBelongsToDisplay(existingProof?.displayId, display.id)) throw forbidden('Proof identity belongs to another display')
    if (e.rideId && !(await prisma.ride.findUnique({ where: { id: e.rideId }, select: { id: true } }))) throw notFound('Ride not found')
    if (e.campaignId && !(await prisma.displayCampaignAssignment.findUnique({ where: { displayId_campaignId: { displayId: display.id, campaignId: e.campaignId } }, select: { id: true } }))) throw forbidden('Campaign was not assigned to this display')
    if (e.creativeId) {
      const creative = await prisma.creative.findUnique({ where: { id: e.creativeId }, select: { id: true, campaignId: true } })
      if (!creative) throw notFound('Creative not found')
      if (e.campaignId && creative.campaignId !== e.campaignId) throw new ApiError('PROOF_CREATIVE_CAMPAIGN_MISMATCH', 'Creative does not belong to campaign', 422)
      if (assetId && !(await prisma.asset.findFirst({ where: { id: assetId, creativeId: e.creativeId }, select: { id: true } }))) throw new ApiError('PROOF_ASSET_CREATIVE_MISMATCH', 'Asset does not belong to creative', 422)
    }
    const location = await prisma.displayLocationEvent.findFirst({ where: { displayId: display.id, occurredAt: { gte: new Date(started.getTime() - 10 * 60_000), lte: new Date(started.getTime() + 2 * 60_000) } }, orderBy: { occurredAt: 'desc' } })
    const proofData = { proofId, rideId: e.rideId, displayId: display.id, campaignSessionId: e.campaignSessionId, campaignId: e.campaignId, creativeId: e.creativeId, scheduleItemId: e.scheduleItemId, assetId, playbackStartedAt: started, playbackEndedAt: ended, expectedDuration: expected, actualDuration: actual, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion ?? e.appVersion, playbackCompleted: succeeded, status: canonicalProofStatus(succeeded, actual, expected), invalidReason: e.failureReason, latitude: location?.latitude, longitude: location?.longitude, locationAccuracy: location?.accuracyMeters, locationOccurredAt: location?.occurredAt } as any
    try {
      await prisma.proofOfPlay.upsert({ where: { proofId }, update: {}, create: proofData })
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error
      const existing = await prisma.proofOfPlay.findUnique({ where: { proofId } })
      const sameIdentity = existing && existing.displayId === display.id && existing.campaignId === proofData.campaignId && existing.creativeId === proofData.creativeId && existing.scheduleItemId === proofData.scheduleItemId && existing.assetId === proofData.assetId && existing.playbackCompleted === proofData.playbackCompleted && existing.expectedDuration === proofData.expectedDuration && existing.actualDuration === proofData.actualDuration
      if (!sameIdentity) throw new ApiError('PROOF_IDEMPOTENCY_CONFLICT', 'Proof identity already exists with different playback data', 409)
      request.log.info({ proofId }, 'proof duplicate acknowledged idempotently')
    }
    const eventId = e.eventId ?? proofId
    if (eventId) await prisma.playbackEvent.create({ data: { eventId, displayId: display.id, rideId: e.rideId, campaignSessionId: e.campaignSessionId, campaignId: e.campaignId, creativeId: e.creativeId, assetId, eventType: succeeded ? 'CREATIVE_COMPLETED' : 'CREATIVE_FAILED', occurredAt: ended ?? started, duration: actual, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion ?? e.appVersion, errorCode: succeeded ? undefined : e.failureReason, latitude: location?.latitude, longitude: location?.longitude, locationAccuracy: location?.accuracyMeters, locationOccurredAt: location?.occurredAt } }).catch((error: any) => error?.code === 'P2002' ? null : Promise.reject(error))
    accepted += 1
    acceptedEventIds.push(proofId)
  }
  return ok(request, { accepted, acceptedEventIds }, reply)
})

app.get('/api/earnings/summary', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const rows = await prisma.earningEntry.findMany({ where: { driverId: d.id } }); const sum = (status?: string) => rows.filter((r) => !status || r.status === status).reduce((n, r) => n + r.amountMinor, 0n); return ok(request, { availableBalanceMinor: sum('AVAILABLE').toString(), pendingBalanceMinor: sum('PENDING').toString(), lifetimeEarningsMinor: sum().toString(), currency: 'INR' }, reply) })
app.get('/api/earnings/ledger', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, asJson(await prisma.earningEntry.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' } })), reply) })
app.get('/api/wallet', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const rows = await prisma.earningEntry.findMany({ where: { driverId: d.id } }); const available = rows.filter((r) => r.status === 'AVAILABLE').reduce((n, r) => n + r.amountMinor, 0n); const pending = rows.filter((r) => r.status === 'PENDING').reduce((n, r) => n + r.amountMinor, 0n); return ok(request, { availableBalanceMinor: available.toString(), pendingBalanceMinor: pending.toString(), currency: 'INR' }, reply) })
app.post('/api/payout-methods', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ type: z.enum(['UPI','BANK']), value: z.string().min(4) })); return ok(request, await prisma.payoutMethod.create({ data: { driverId: d.id, type: input.type, maskedValue: `${input.value.slice(0, 2)}***${input.value.slice(-4)}`, secretRef: hashSecret(input.value), verified: false } }), reply) })
app.get('/api/payout-methods', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.payoutMethod.findMany({ where: { driverId: d.id }, select: { id: true, type: true, maskedValue: true, verified: true, createdAt: true } }), reply) })
app.post('/api/payouts', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ payoutMethodId: z.string().uuid(), amountMinor: z.coerce.bigint(), idempotencyKey: z.string().min(8) })); const method = await prisma.payoutMethod.findFirst({ where: { id: input.payoutMethodId, driverId: d.id, verified: true } }); if (!method) throw notFound('Verified payout method not found'); const available = (await prisma.earningEntry.findMany({ where: { driverId: d.id, status: 'AVAILABLE' } })).reduce((n, r) => n + r.amountMinor, 0n); if (input.amountMinor < config.payoutMinimumMinor || input.amountMinor > available) throw new ApiError('INVALID_PAYOUT_AMOUNT', 'Payout amount is not available', 422); return ok(request, await prisma.payout.create({ data: { driverId: d.id, payoutMethodId: method.id, amountMinor: input.amountMinor, idempotencyKey: input.idempotencyKey, status: 'PROCESSING' } }), reply) })
app.get('/api/payouts', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, asJson(await prisma.payout.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' } })), reply) })

app.post('/api/safety/incidents', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ type: z.string(), vehicleId: z.string().uuid().optional(), rideId: z.string().uuid().optional(), latitude: z.number().optional(), longitude: z.number().optional(), notes: z.string().optional() })); return ok(request, await prisma.safetyIncident.create({ data: { driverId: d.id, occurredAt: new Date(), ...input } }), reply) })
app.post('/api/roadside/requests', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ issueType: z.string(), vehicleId: z.string().uuid().optional(), latitude: z.number().optional(), longitude: z.number().optional() })); return ok(request, await prisma.roadsideRequest.create({ data: { driverId: d.id, ...input, provider: 'MOCK_PROVIDER' } }), reply) })
app.post('/api/support/tickets', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ category: z.string(), description: z.string().min(1), rideId: z.string().optional(), displayId: z.string().optional(), vehicleId: z.string().optional() })); return ok(request, await prisma.supportTicket.create({ data: { driverId: d.id, ...input } }), reply) })
app.get('/api/agreements/required', async (request, reply) => ok(request, await prisma.agreementVersion.findMany({ where: { required: true }, orderBy: { createdAt: 'desc' } }), reply))
app.post('/api/agreements/:versionId/accept', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { versionId } = request.params as { versionId: string }; return ok(request, await prisma.driverConsent.upsert({ where: { driverId_agreementVersionId: { driverId: d.id, agreementVersionId: versionId } }, update: { acceptedAt: new Date() }, create: { driverId: d.id, agreementVersionId: versionId } }), reply) })

app.post('/api/admin/displays', async (request, reply) => {
  const auth = await requirePermission(request, 'device:write')
  const input = bodyOf(request, z.object({
    screenName: z.string().trim().min(1).max(120),
    screenType: z.string().trim().min(1).max(40),
    city: z.string().trim().min(1).max(100),
    area: z.string().trim().max(100).optional(),
    vehicleId: z.string().trim().optional(),
    notes: z.string().trim().max(1000).optional(),
  }))
  const vehicle = input.vehicleId ? await prisma.vehicle.findFirst({ where: { OR: [...(/^[0-9a-f-]{36}$/i.test(input.vehicleId) ? [{ id: input.vehicleId }] : []), { registrationNumber: input.vehicleId }] } }) : null
  const display = await prisma.display.create({ data: { deviceId: `pending-${randomSecret(8)}`, name: input.screenName, ownershipType: input.screenType, vehicleId: vehicle?.id, inventoryConfig: {create:{city:input.city,coverage:{area:input.area??""}}} } })
  const code = generatePairingCode(); const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await prisma.displayPairingCode.create({ data: { displayId: display.id, codeHash: hashSecret(code), codeLast4: code.slice(-4), expiresAt } })
  await prisma.auditLog.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'DISPLAY_CREATED', entityType: 'Display', entityId: display.id, after: { city: input.city, area: input.area, notes: input.notes } as any, requestId: request.id } })
  return ok(request, { displayId: display.id, pairingCode: code, expiresAt, display }, reply)
})
app.get('/api/admin/drivers', async (request, reply) => { await requirePermission(request, 'driver:read'); return ok(request, asJson(await prisma.driver.findMany({ select: { id: true, userId: true, driverType: true, onboardingStatus: true, preferredLanguage: true, city: true, profilePhotoUrl: true, user: { select: { id: true, name: true, email: true, phone: true, role: true, accountStatus: true } }, vehicles: { select: { id: true, registrationNumber: true, type: true, city: true, area: true, status: true } } } })), reply) })
app.get('/api/admin/vehicles', async (request, reply) => { await requirePermission(request, 'device:read'); return ok(request, await prisma.vehicle.findMany({ select: { id: true, driverId: true, type: true, cabType: true, registrationNumber: true, city: true, area: true, routeId: true, depotId: true, manufacturer: true, model: true, year: true, fuelType: true, status: true, driver: { select: { id: true, user: { select: { id: true, name: true, email: true, phone: true, accountStatus: true } } } }, displays: { select: { id: true, deviceId: true, name: true, state: true, appVersion: true, manifestVersion: true } } } }), reply) })
app.get('/api/admin/displays', async (request, reply) => { await requirePermission(request, 'device:read'); const rows = await prisma.display.findMany({ select: { id: true, deviceId: true, name: true, ownershipType: true, inventoryConfig: { select: {city:true} }, vehicleId: true, state: true, appVersion: true, manifestVersion: true, lastLatitude: true, lastLongitude: true, lastLocationAccuracy: true, lastLocationAt: true, lastHeartbeatAt: true, currentCampaignId: true, currentCreativeId: true, currentAssetId: true, currentPlaybackState: true, vehicle: { select: { registrationNumber: true, city: true, area: true, type: true, routeId: true, depotId: true } }, createdAt: true, updatedAt: true, heartbeats: { select: { occurredAt: true, receivedAt: true, networkType: true }, orderBy: { receivedAt: 'desc' }, take: 1 } } }); return ok(request, asJson(rows.map((display) => ({ ...display, connectivity: getDisplayConnectivity(display.lastHeartbeatAt ?? display.heartbeats[0]?.receivedAt, new Date(), config.heartbeatOnlineSeconds, config.heartbeatDegradedSeconds) }))), reply) })
app.get('/api/admin/displays/:displayId/live-state', async (request, reply) => {
  await requirePermission(request, 'device:read')
  const { displayId } = request.params as { displayId: string }
  const display = await prisma.display.findUnique({ where: { id: displayId }, include: { vehicle: true, heartbeats: { orderBy: { receivedAt: 'desc' }, take: 1 } } })
  if (!display) throw notFound('Display not found')
  const uuid = (value?: string | null) => value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null
  const [campaign, creative, recentEvent, recentProof] = await Promise.all([
    uuid(display.currentCampaignId) ? prisma.campaign.findUnique({ where: { id: display.currentCampaignId! }, select: { id: true, name: true } }) : null,
    uuid(display.currentCreativeId) ? prisma.creative.findUnique({ where: { id: display.currentCreativeId! }, include: { campaign: { select: { id: true, name: true } }, asset: { select: { url: true, mimeType: true, fileName: true } } } }) : null,
    prisma.playbackEvent.findFirst({ where: { displayId, eventType: { in: ['CREATIVE_COMPLETED', 'CREATIVE_FAILED'] } }, orderBy: { occurredAt: 'desc' } }),
    prisma.proofOfPlay.findFirst({ where: { displayId }, orderBy: { playbackStartedAt: 'desc' } }),
  ])
  const heartbeat = display.heartbeats[0]
  const connection = getDisplayConnectivity(heartbeat?.receivedAt, new Date(), config.heartbeatOnlineSeconds, config.heartbeatDegradedSeconds)
  const { deviceTokenHash: _tokenHash, ...safeDisplay } = display
  return ok(request, asJson({ ...safeDisplay, connectivity: connection, lastHeartbeat: heartbeat ?? null, currentCampaign: creative?.campaign ?? campaign, currentCreative: creative, lastProof: recentEvent && (!recentProof || recentEvent.occurredAt > recentProof.playbackStartedAt) ? recentEvent : recentProof }), reply)
})
app.get('/api/admin/displays/live-map', async (request, reply) => { await requirePermission(request, 'device:read'); const now = new Date(); const rows = await prisma.display.findMany({ where: { lastLatitude: { not: null }, lastLongitude: { not: null }, lastLocationAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }, select: { id: true, name: true, deviceId: true, vehicleId: true, vehicle: { select: { registrationNumber: true, city: true, area: true, type: true, routeId: true, depotId: true } }, lastLatitude: true, lastLongitude: true, lastLocationAccuracy: true, lastLocationAt: true, lastHeartbeatAt: true, currentCampaignId: true, currentCreativeId: true, currentAssetId: true, currentPlaybackState: true, currentPlaybackStartedAt: true, currentPlaybackPositionMs: true, currentExpectedDurationMs: true, manifestVersion: true } }); return ok(request, asJson(rows.map((display) => ({ ...display, connectivity: getDisplayConnectivity(display.lastHeartbeatAt ?? undefined, now, config.heartbeatOnlineSeconds, config.heartbeatDegradedSeconds) }))), reply) })
app.get('/api/admin/displays/:displayId/location-history', async (request, reply) => { await requirePermission(request, 'device:read'); const { displayId } = request.params as { displayId: string }; const query = request.query as { from?: string; to?: string; limit?: string }; const limit = boundedLocationLimit(query.limit); const from = query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000); const to = query.to ? new Date(query.to) : new Date(); if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) throw new ApiError('VALIDATION_ERROR', 'Invalid history range', 422); const points = await prisma.displayLocationEvent.findMany({ where: { displayId, occurredAt: { gte: from, lte: to } }, orderBy: { occurredAt: 'desc' }, take: limit }); return ok(request, asJson(points.reverse()), reply) })
app.get('/api/admin/orders', async (request, reply) => { await requirePermission(request, 'finance:read'); const query = request.query as { status?: string; search?: string; skip?: string; take?: string }; const orders = await listGuestOrders({ status: query.status, search: query.search?.trim(), skip: Math.min(Number(query.skip ?? 0) || 0, 100000), take: Math.min(Number(query.take ?? 50) || 50, 100) }); return ok(request, orders, reply) })
app.get('/api/admin/orders/:orderNumber', async (request, reply) => { await requirePermission(request, 'finance:read'); const { orderNumber } = request.params as { orderNumber: string }; const order = await findGuestOrder(orderNumber); if (!order) throw notFound('Order not found'); return ok(request, order, reply) })
app.post('/api/admin/orders/:orderNumber/create-campaign', async () => paymentProcessingRetired())
app.get('/api/admin/rides', async (request, reply) => { await requirePermission(request, 'ride:read'); return ok(request, asJson(await prisma.ride.findMany({ orderBy: { createdAt: 'desc' }, take: 500, select: { id: true, candidateId: true, driverId: true, vehicleId: true, displayId: true, provider: true, state: true, source: true, createdAt: true, updatedAt: true, startedAt: true, completedAt: true, distanceMeters: true, verificationStatus: true } })), reply) })
app.get('/api/admin/verifications', async (request, reply) => { await requirePermission(request, 'verification:read'); return ok(request, await prisma.rideVerification.findMany({ orderBy: { rideId: 'desc' }, select: { id: true, rideId: true, score: true, status: true, reasons: true, verifiedAt: true, reviewedBy: true, reviewReason: true } }), reply) })
app.get('/api/admin/fraud', async (request, reply) => { await requirePermission(request, 'fraud:read'); return ok(request, asJson(await prisma.fraudSignal.findMany({ orderBy: { createdAt: 'desc' }, take: 500, select: { id: true, rideId: true, code: true, weight: true, metadata: true, createdAt: true } })), reply) })
app.get('/api/admin/proof-of-play', async (request, reply) => {
 await requirePermission(request, 'campaign:read')
 const q = z.object({ campaignId:z.string().optional(),creativeId:z.string().optional(),displayId:z.string().uuid().optional(),vehicleId:z.string().uuid().optional(),routeId:z.string().uuid().optional(),from:z.coerce.date().optional(),to:z.coerce.date().optional(),success:z.enum(['true','false']).optional(),skip:z.coerce.number().int().min(0).max(100000).default(0) }).parse(request.query)
 const where = { campaignId:q.campaignId,creativeId:q.creativeId,displayId:q.displayId,playbackStartedAt:{gte:q.from,lte:q.to},playbackCompleted:q.success===undefined?undefined:q.success==='true',display:{vehicleId:q.vehicleId,...(q.routeId?{vehicle:{routeId:q.routeId}}:{})} }
 const [items,total] = await Promise.all([prisma.proofOfPlay.findMany({where,orderBy:{playbackStartedAt:'desc'},take:50,skip:q.skip,include:{display:{select:{name:true,vehicleId:true}}}}),prisma.proofOfPlay.count({where})])
 return ok(request,{items,total,skip:q.skip,take:50},reply)
})
app.get('/api/admin/earnings', async (request, reply) => { await requirePermission(request, 'finance:read'); return ok(request, asJson(await prisma.earningEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })), reply) })
app.get('/api/admin/payouts', async (request, reply) => { await requirePermission(request, 'finance:read'); return ok(request, asJson(await prisma.payout.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })), reply) })
app.post('/api/admin/drivers/:driverId/restrict', async (request, reply) => { const auth = await requirePermission(request, 'admin:write'); const { driverId } = request.params as { driverId: string }; const driver = await prisma.driver.findUnique({ where: { id: driverId } }); if (!driver) throw notFound('Driver not found'); await prisma.user.update({ where: { id: driver.userId }, data: { accountStatus: 'RESTRICTED' } }); await prisma.auditLog.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'DRIVER_RESTRICTED', entityType: 'Driver', entityId: driverId, requestId: request.id } }); return ok(request, { restricted: true }, reply) })
app.post('/api/admin/displays/:displayId/commands', async (request, reply) => { const auth = await requirePermission(request, 'device:write'); const { displayId } = request.params as { displayId: string }; const input = bodyOf(request, z.object({ commandType: z.enum(['WAKE','SLEEP','START_SESSION','STOP_SESSION','SYNC_MANIFEST','REFRESH_MANIFEST','HEALTH_CHECK','RESTART_PLAYER','RESTART_APP','CLEAR_CACHE','UNPAIR']), payload: z.record(z.string(), z.unknown()).optional() })); const display = await prisma.display.findUnique({ where: { id: displayId } }); if (!display) throw notFound('Display not found'); const command = await prisma.displayCommand.create({ data: { displayId, commandType: input.commandType, payload: input.payload as any, expiresAt: new Date(Date.now() + 120000) } }); await prisma.auditLog.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'DISPLAY_COMMAND_QUEUED', entityType: 'DisplayCommand', entityId: command.id, after: { commandType: input.commandType } as any, requestId: request.id } }); return ok(request, command, reply) })

registerOperations(app)
registerAdminManagement(app)
registerAssetRoutes(app)
registerNetworkOperations(app)

app.setErrorHandler((error, request, reply) => { request.log.error({ err: error }, 'request failed'); const mongoFailure = isMongoError(error); const status = error instanceof ApiError ? error.statusCode : error instanceof z.ZodError ? 422 : error instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(error.code) ? 409 : mongoFailure ? 503 : 500; const message = error instanceof Error ? error.message : 'Internal server error'; reply.status(status).send({ data: null, error: { code: error instanceof ApiError ? error.code : mongoFailure ? 'GUEST_STORE_UNAVAILABLE' : 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : message }, requestId: request.id }) })

export { app }
