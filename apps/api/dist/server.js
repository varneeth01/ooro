/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { z } from 'zod';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { ApiError, forbidden, notFound } from './errors.js';
import { authenticateDisplay, hashSecret, issueTokens, randomSecret, requireAuth, requireRoles, response } from './http.js';
import { assertRideTransition, stateForEvent } from './domain/ride-state.js';
import { verifyRide } from './domain/verification.js';
import { calculateEarnings } from './domain/earnings.js';
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(helmet);
const ok = (request, data, reply) => reply.send(response(request, data));
const bodyOf = (request, schema) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success)
        throw new ApiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 422);
    return parsed.data;
};
const asJson = (value) => JSON.parse(JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item));
const driverFrom = async (auth) => {
    if (!auth.driverId)
        throw forbidden('Driver account required');
    const driver = await prisma.driver.findUnique({ where: { id: auth.driverId }, include: { user: true } });
    if (!driver)
        throw notFound('Driver not found');
    if (driver.user.accountStatus === 'SUSPENDED' || driver.user.accountStatus === 'CLOSED')
        throw forbidden('Driver account is restricted');
    return driver;
};
const hashOtp = (phone, code) => createHash('sha256').update(`${phone}:${code}`).digest('hex');
const generatePairingCode = () => { const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; const bytes = randomBytes(6); return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(''); };
app.get('/health', async (request, reply) => ok(request, { status: 'ok', service: 'ooro-api' }, reply));
app.post('/api/auth/request-otp', async (request, reply) => {
    const { phone } = bodyOf(request, z.object({ phone: z.string().min(7).max(20) }));
    const code = config.nodeEnv !== 'production' && config.devMockOtpEnabled ? config.devMockOtp : String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + config.otpTtlSeconds * 1000);
    await prisma.otpChallenge.create({ data: { phone, codeHash: hashOtp(phone, code), expiresAt } });
    return ok(request, { expiresAt, ...(config.nodeEnv !== 'production' && config.devMockOtpEnabled ? { devOtp: code } : {}) }, reply);
});
app.post('/api/auth/verify-otp', async (request, reply) => {
    const { phone, code, name } = bodyOf(request, z.object({ phone: z.string().min(7), code: z.string().length(6), name: z.string().min(1).optional() }));
    const challenge = await prisma.otpChallenge.findFirst({ where: { phone, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (!challenge || challenge.codeHash !== hashOtp(phone, code))
        throw new ApiError('INVALID_OTP', 'Invalid or expired OTP', 401);
    await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const user = await prisma.user.upsert({ where: { phone }, update: name ? { name } : {}, create: { phone, name, role: 'DRIVER', accountStatus: 'PENDING' } });
    const driver = await prisma.driver.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    const tokens = await issueTokens(user.id, user.role, driver.id);
    return ok(request, { ...tokens, user: { id: user.id, phone: user.phone, role: user.role }, driver: { id: driver.id, onboardingStatus: driver.onboardingStatus } }, reply);
});
app.post('/api/auth/refresh', async (request, reply) => {
    const { refreshToken } = bodyOf(request, z.object({ refreshToken: z.string().min(20) }));
    const session = await prisma.session.findUnique({ where: { refreshTokenHash: hashSecret(refreshToken) }, include: { user: { include: { driver: true } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date())
        throw new ApiError('INVALID_SESSION', 'Refresh session is invalid', 401);
    await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return ok(request, await issueTokens(session.userId, session.user.role, session.user.driver?.id), reply);
});
app.post('/api/auth/logout', async (request, reply) => {
    const { refreshToken } = bodyOf(request, z.object({ refreshToken: z.string().min(20) }));
    await prisma.session.updateMany({ where: { refreshTokenHash: hashSecret(refreshToken) }, data: { revokedAt: new Date() } });
    return ok(request, { loggedOut: true }, reply);
});
app.get('/api/auth/session', async (request, reply) => { const auth = await requireAuth(request); return ok(request, auth, reply); });
app.get('/api/drivers/me', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, asJson(driver), reply); });
app.patch('/api/drivers/me', async (request, reply) => {
    const auth = await requireAuth(request);
    const driver = await driverFrom(auth);
    const input = bodyOf(request, z.object({ name: z.string().min(1).optional(), email: z.string().email().optional(), city: z.string().optional(), preferredLanguage: z.string().optional(), dateOfBirth: z.coerce.date().optional(), profilePhotoUrl: z.string().url().optional(), emergencyContact: z.record(z.string(), z.string()).optional() }));
    const updated = await prisma.$transaction(async (tx) => { if (input.name !== undefined || input.email !== undefined)
        await tx.user.update({ where: { id: driver.userId }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.email !== undefined ? { email: input.email } : {}) } }); return tx.driver.update({ where: { id: driver.id }, data: { city: input.city, preferredLanguage: input.preferredLanguage, dateOfBirth: input.dateOfBirth, profilePhotoUrl: input.profilePhotoUrl, emergencyContact: input.emergencyContact } }); });
    return ok(request, asJson(updated), reply);
});
app.get('/api/drivers/me/status', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const docs = await prisma.kycDocument.findMany({ where: { driverId: d.id } }); return ok(request, { onboardingStatus: d.onboardingStatus, accountStatus: d.user.accountStatus, kyc: docs.map((x) => ({ id: x.id, type: x.documentType, status: x.status })) }, reply); });
app.post('/api/fleet/inquiries', async (request, reply) => { const input = bodyOf(request, z.object({ name: z.string(), phone: z.string(), email: z.string().email().optional(), companyName: z.string().optional(), city: z.string().optional(), fleetSize: z.number().int().positive().optional(), vehicleTypes: z.array(z.string()).default([]), message: z.string().optional() })); return ok(request, await prisma.fleetInquiry.create({ data: input }), reply); });
app.post('/api/kyc/documents', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const input = bodyOf(request, z.object({ documentType: z.string(), storageKey: z.string().min(1), maskedDocumentNumber: z.string().optional(), expiresAt: z.coerce.date().optional() })); return ok(request, await prisma.kycDocument.create({ data: { driverId: driver.id, ...input } }), reply); });
app.get('/api/kyc/documents', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, await prisma.kycDocument.findMany({ where: { driverId: driver.id }, orderBy: { submittedAt: 'desc' } }), reply); });
app.get('/api/kyc/status', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); return ok(request, await prisma.kycDocument.groupBy({ by: ['status'], where: { driverId: driver.id }, _count: true }), reply); });
const vehicleSchema = z.object({ type: z.enum(['AUTO', 'CAB']), cabType: z.string().optional(), registrationNumber: z.string().min(3), manufacturer: z.string().min(1), model: z.string().min(1), year: z.number().int().optional(), fuelType: z.string().optional() });
app.post('/api/vehicles', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, vehicleSchema); return ok(request, await prisma.vehicle.create({ data: { driverId: d.id, ...input } }), reply); });
app.get('/api/vehicles', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.vehicle.findMany({ where: { driverId: d.id }, include: { displays: true } }), reply); });
app.get('/api/vehicles/:vehicleId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { vehicleId } = request.params; const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverId: d.id }, include: { displays: true } }); if (!v)
    throw notFound('Vehicle not found'); return ok(request, v, reply); });
app.patch('/api/vehicles/:vehicleId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { vehicleId } = request.params; const v = await prisma.vehicle.findFirst({ where: { id: vehicleId, driverId: d.id } }); if (!v)
    throw notFound('Vehicle not found'); return ok(request, await prisma.vehicle.update({ where: { id: vehicleId }, data: bodyOf(request, vehicleSchema.partial()) }), reply); });
app.post('/api/displays/pairing-code', async (request, reply) => {
    await requireAuth(request);
    const input = bodyOf(request, z.object({ displayId: z.string().uuid().optional(), deviceId: z.string().min(1).optional(), name: z.string().default('OORO Display'), ownershipType: z.string().optional() }));
    const display = input.displayId ? await prisma.display.findFirst({ where: { id: input.displayId } }) : await prisma.display.create({ data: { deviceId: input.deviceId ?? `pending-${randomSecret(8)}`, name: input.name, ownershipType: input.ownershipType } });
    if (!display)
        throw notFound('Display not found');
    const code = generatePairingCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.displayPairingCode.create({ data: { displayId: display.id, codeHash: hashSecret(code), codeLast4: code.slice(-4), expiresAt } });
    return ok(request, { displayId: display.id, pairingCode: code, expiresAt }, reply);
});
app.post('/api/displays/pair', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ pairingCode: z.string().min(6), vehicleId: z.string().uuid(), ownershipType: z.string().optional() })); const v = await prisma.vehicle.findFirst({ where: { id: input.vehicleId, driverId: d.id } }); if (!v)
    throw notFound('Vehicle not found'); const p = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }); if (!p)
    throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400); const display = await prisma.$transaction(async (tx) => { await tx.displayPairingCode.update({ where: { id: p.id }, data: { consumedAt: new Date() } }); return tx.display.update({ where: { id: p.displayId }, data: { vehicleId: v.id, ownershipType: input.ownershipType ?? v.type, state: 'PAIRING' } }); }); return ok(request, { displayId: display.id, vehicleId: v.id, state: display.state, pairedAt: new Date() }, reply); });
app.get('/api/displays/:displayId/status', async (request, reply) => { const auth = await requireAuth(request); const { displayId } = request.params; const display = await prisma.display.findUnique({ where: { id: displayId }, include: { vehicle: true, heartbeats: { orderBy: { occurredAt: 'desc' }, take: 1 } } }); if (!display)
    throw notFound('Display not found'); if (display.vehicle && auth.driverId !== display.vehicle.driverId && !['ADMIN', 'SUPER_ADMIN', 'OPERATIONS'].includes(auth.role))
    throw forbidden(); const hb = display.heartbeats[0]; const age = hb ? (Date.now() - hb.occurredAt.getTime()) / 1000 : Infinity; const connectivity = age < config.heartbeatOnlineSeconds ? 'ONLINE' : age < config.heartbeatDegradedSeconds ? 'DEGRADED' : 'OFFLINE'; return ok(request, { ...asJson(display), connectivity, lastHeartbeat: hb ? asJson(hb) : null }, reply); });
app.post('/api/device/pair', async (request, reply) => { const input = bodyOf(request, z.object({ pairingCode: z.string().min(6), deviceId: z.string().min(1), deviceName: z.string().optional(), manufacturer: z.string().optional(), model: z.string().optional(), androidVersion: z.string().optional(), appVersion: z.string().optional() })); const p = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }); if (!p)
    throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400); const token = randomSecret(); const display = await prisma.$transaction(async (tx) => { await tx.displayPairingCode.update({ where: { id: p.id }, data: { consumedAt: new Date() } }); return tx.display.update({ where: { id: p.displayId }, data: { deviceId: input.deviceId, name: input.deviceName ?? 'OORO Screen', deviceTokenHash: hashSecret(token), state: 'READY', appVersion: input.appVersion } }); }); return ok(request, { success: true, deviceToken: token, screenId: display.id, displayId: display.id, workspaceId: 'default', deviceName: display.name }, reply); });
app.post('/api/device/heartbeat', async (request, reply) => { const display = await authenticateDisplay(request); const input = bodyOf(request, z.object({ timestamp: z.coerce.date().optional(), appVersion: z.string().optional(), deviceVersion: z.string().optional(), storageFree: z.coerce.bigint().optional(), storageTotal: z.coerce.bigint().optional(), networkType: z.string().optional(), networkConnected: z.boolean().optional(), manifestVersion: z.number().int().optional(), currentCreativeId: z.string().optional(), playbackState: z.string().optional(), screenState: z.string().optional(), temperature: z.number().optional() })); const hb = await prisma.displayHeartbeat.create({ data: { displayId: display.id, occurredAt: input.timestamp ?? new Date(), ...input } }); await prisma.display.update({ where: { id: display.id }, data: { appVersion: input.appVersion, manifestVersion: input.manifestVersion, state: input.screenState ?? 'READY' } }); return ok(request, { accepted: true, heartbeatId: hb.id, serverTime: new Date() }, reply); });
app.get('/api/device/manifest', async (request, reply) => { const display = await authenticateDisplay(request); return ok(request, { version: display.manifestVersion ?? 0, screenId: display.id, generatedAt: new Date().toISOString(), validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), timezone: 'Asia/Kolkata', items: [] }, reply); });
app.post('/api/device/unpair', async (request, reply) => { const display = await authenticateDisplay(request); await prisma.display.update({ where: { id: display.id }, data: { deviceTokenHash: null, state: 'UNPAIRED' } }); return ok(request, { unpaired: true }, reply); });
const eventSchema = z.object({ eventId: z.string().min(4), provider: z.string(), eventType: z.string(), timestamp: z.coerce.date().optional(), occurredAt: z.coerce.date().optional(), confidence: z.number().min(0).max(1).default(1), source: z.string().optional(), parserVersion: z.number().int().optional() });
async function processMobilityEvent(driver, event, requestId) {
    const vehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id }, orderBy: { createdAt: 'asc' } });
    const display = vehicle ? await prisma.display.findFirst({ where: { vehicleId: vehicle.id } }) : null;
    const occurredAt = event.occurredAt ?? event.timestamp ?? new Date();
    const recorded = await prisma.mobilityEvent.create({ data: { eventId: event.eventId, driverId: driver.id, vehicleId: vehicle?.id, provider: event.provider, eventType: event.eventType, occurredAt, confidence: event.confidence, source: event.source, parserVersion: event.parserVersion } }).catch((error) => error?.code === 'P2002' ? null : Promise.reject(error));
    if (!recorded)
        return { duplicate: true };
    let candidate = await prisma.rideCandidate.findFirst({ where: { driverId: driver.id, provider: event.provider, state: { in: ['TO_PICKUP', 'DETECTED', 'CONVERTED'] } }, orderBy: { lastEventAt: 'desc' }, include: { ride: true } });
    let ride = candidate?.ride;
    if (event.eventType === 'RIDE_ACCEPTED' || event.eventType === 'RIDE_REQUESTED') {
        if (!candidate) {
            candidate = await prisma.rideCandidate.create({ data: { driverId: driver.id, vehicleId: vehicle?.id, displayId: display?.id, provider: event.provider, source: event.source ?? 'MOBILITY', state: 'TO_PICKUP', lastEventAt: occurredAt } });
            ride = await prisma.ride.create({ data: { candidateId: candidate.id, driverId: driver.id, vehicleId: vehicle?.id, displayId: display?.id, provider: event.provider, source: event.source ?? 'MOBILITY', state: 'RIDE_ACCEPTED' } });
        }
    }
    if (!candidate || !ride)
        return { event: recorded, ignored: true };
    const next = stateForEvent(ride.state, event.eventType);
    if (next) {
        assertRideTransition(ride.state, next);
        if (next === 'ACTIVE_VERIFIED') { /* server verification occurs below */ }
        await prisma.rideEvent.create({ data: { eventId: `${event.eventId}:ride`, rideId: ride.id, candidateId: candidate.id, provider: event.provider, eventType: event.eventType, occurredAt, confidence: event.confidence, source: event.source } });
        await prisma.ride.update({ where: { id: ride.id }, data: { state: next === 'ACTIVE_VERIFIED' ? 'VERIFYING' : next, startedAt: undefined } });
        await prisma.rideCandidate.update({ where: { id: candidate.id }, data: { lastEventAt: occurredAt, state: next === 'ACTIVE_VERIFIED' ? 'VERIFYING' : next } });
        if (next === 'VERIFYING' || next === 'ACTIVE_VERIFIED')
            await verifyAndStartSession(ride.id, driver.id, requestId);
        if (next === 'ENDING')
            await finishRide(ride.id, requestId);
    }
    await prisma.mobilityIntegration.upsert({ where: { driverId_provider: { driverId: driver.id, provider: event.provider } }, update: { enabled: true, lastEventAt: occurredAt, status: 'ACTIVE' }, create: { driverId: driver.id, provider: event.provider, enabled: true, lastEventAt: occurredAt, status: 'ACTIVE' } });
    return { event: recorded, rideId: ride.id, state: next ?? ride.state };
}
async function verifyAndStartSession(rideId, driverId, requestId) {
    const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { events: true, locations: true, display: true } });
    if (!ride || ride.state === 'CANCELLED')
        return;
    const heartbeat = ride.displayId ? await prisma.displayHeartbeat.findFirst({ where: { displayId: ride.displayId }, orderBy: { occurredAt: 'desc' } }) : null;
    const result = verifyRide({ source: ride.source, eventTypes: ride.events.map((e) => e.eventType), locationCount: ride.locations.length, displayOnline: !!heartbeat && (Date.now() - heartbeat.occurredAt.getTime()) < config.heartbeatDegradedSeconds * 1000, playbackConfirmed: false, cancellationConflict: ride.events.some((e) => e.eventType === 'RIDE_CANCELLED') });
    await prisma.rideVerification.upsert({ where: { rideId }, update: { score: result.score, status: result.status, reasons: result.reasons, verifiedAt: result.status === 'VERIFIED' ? new Date() : undefined }, create: { rideId, score: result.score, status: result.status, reasons: result.reasons, verifiedAt: result.status === 'VERIFIED' ? new Date() : undefined } });
    if (result.status !== 'VERIFIED' || ride.state === 'ACTIVE_VERIFIED')
        return;
    await prisma.ride.update({ where: { id: rideId }, data: { state: 'ACTIVE_VERIFIED', verificationStatus: 'VERIFIED', startedAt: ride.startedAt ?? new Date() } });
    const session = await prisma.campaignSession.create({ data: { rideId, driverId, vehicleId: ride.vehicleId, displayId: ride.displayId, status: 'STARTING', startedAt: new Date() } });
    if (ride.displayId)
        await prisma.displayCommand.create({ data: { displayId: ride.displayId, commandType: 'START_SESSION', payload: { rideId, campaignSessionId: session.id, issuedAt: new Date().toISOString(), requestId }, expiresAt: new Date(Date.now() + 120000) } });
}
async function finishRide(rideId, requestId) {
    const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: { campaignSessions: true, proofs: true, locations: true } });
    if (!ride)
        return;
    if (ride.displayId)
        await prisma.displayCommand.create({ data: { displayId: ride.displayId, commandType: 'STOP_SESSION', payload: { rideId, requestId }, expiresAt: new Date(Date.now() + 120000) } });
    await prisma.ride.update({ where: { id: rideId }, data: { state: 'COMPLETED', completedAt: new Date(), verificationStatus: ride.verificationStatus } });
    if (ride.campaignSessions[0])
        await prisma.campaignSession.update({ where: { id: ride.campaignSessions[0].id }, data: { status: 'COMPLETED', endedAt: new Date() } });
    const validSeconds = ride.proofs.filter((p) => p.status === 'VALID').reduce((sum, p) => sum + (p.actualDuration ?? 0), 0);
    const amount = calculateEarnings(validSeconds, { baseMinor: 800n, perVerifiedAdMinuteMinor: 100n, peakBonusMinor: 0n });
    await prisma.earningEntry.create({ data: { driverId: ride.driverId, rideId, campaignSessionId: ride.campaignSessions[0]?.id, type: 'AD_EARNING', amountMinor: amount, status: 'PENDING', metadata: { validSeconds } } });
}
app.post('/api/mobility/events', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const input = bodyOf(request, z.object({ events: z.array(eventSchema).min(1).max(50).optional(), event: eventSchema.optional() })); const events = input.events ?? (input.event ? [input.event] : []); if (!events.length)
    throw new ApiError('VALIDATION_ERROR', 'At least one event is required', 422); const results = []; for (const event of events)
    results.push(await processMobilityEvent(driver, event, request.id)); return ok(request, results, reply); });
app.post('/api/rides/:rideId/locations', async (request, reply) => { const auth = await requireAuth(request); const driver = await driverFrom(auth); const { rideId } = request.params; const ride = await prisma.ride.findFirst({ where: { id: rideId, driverId: driver.id } }); if (!ride)
    throw notFound('Ride not found'); const { points } = bodyOf(request, z.object({ points: z.array(z.object({ timestamp: z.coerce.date(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative(), speed: z.number().nonnegative().optional(), bearing: z.number().optional() })).max(500) })); await prisma.rideLocation.createMany({ data: points.map((p) => ({ rideId, occurredAt: p.timestamp, latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, speed: p.speed, bearing: p.bearing })) }); return ok(request, { accepted: points.length }, reply); });
app.get('/api/rides', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.ride.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' }, include: { verification: true, campaignSessions: true } }), reply); });
app.get('/api/rides/:rideId', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { rideId } = request.params; const ride = await prisma.ride.findFirst({ where: { id: rideId, driverId: d.id }, include: { events: true, locations: true, verification: true, proofs: true, campaignSessions: true } }); if (!ride)
    throw notFound('Ride not found'); return ok(request, asJson(ride), reply); });
app.post('/api/playback/events', async (request, reply) => { const display = await authenticateDisplay(request); const input = bodyOf(request, z.object({ events: z.array(z.object({ eventId: z.string(), rideId: z.string().uuid().optional(), campaignSessionId: z.string().uuid().optional(), campaignId: z.string().optional(), creativeId: z.string().optional(), eventType: z.string(), timestamp: z.coerce.date().optional(), position: z.number().int().optional(), duration: z.number().int().optional(), manifestVersion: z.number().int().optional(), playerVersion: z.string().optional(), errorCode: z.string().optional() })).min(1).max(100) })); const inserted = []; for (const e of input.events) {
    const row = await prisma.playbackEvent.create({ data: { eventId: e.eventId, displayId: display.id, rideId: e.rideId, campaignSessionId: e.campaignSessionId, campaignId: e.campaignId, creativeId: e.creativeId, eventType: e.eventType, occurredAt: e.timestamp ?? new Date(), position: e.position, duration: e.duration, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion, errorCode: e.errorCode } }).catch((error) => error?.code === 'P2002' ? null : Promise.reject(error));
    if (row)
        inserted.push(row);
} return ok(request, { accepted: inserted.length }, reply); });
app.post('/api/device/proof-of-play', async (request, reply) => {
    const display = await authenticateDisplay(request);
    const input = bodyOf(request, z.object({ events: z.array(z.object({ eventId: z.string().optional(), proofId: z.string().optional(), rideId: z.string().uuid().optional(), campaignSessionId: z.string().uuid().optional(), campaignId: z.string().optional(), creativeId: z.string().optional(), scheduleItemId: z.string().optional(), playbackStartedAt: z.coerce.date().optional(), playbackEndedAt: z.coerce.date().optional(), startedAt: z.coerce.date().optional(), endedAt: z.coerce.date().optional(), expectedDuration: z.number().int().positive().optional(), actualDuration: z.number().int().nonnegative().optional(), manifestVersion: z.number().int().optional(), playerVersion: z.string().optional(), appVersion: z.string().optional(), playbackCompleted: z.boolean().optional(), success: z.boolean().optional() })).min(1) }));
    let accepted = 0;
    for (const e of input.events) {
        const started = e.playbackStartedAt ?? e.startedAt ?? new Date();
        const ended = e.playbackEndedAt ?? e.endedAt;
        const actual = e.actualDuration ?? (ended ? Math.max(0, Math.round((ended.getTime() - started.getTime()) / 1000)) : undefined);
        if (e.rideId && e.proofId) {
            await prisma.proofOfPlay.upsert({ where: { proofId: e.proofId }, update: {}, create: { proofId: e.proofId, rideId: e.rideId, displayId: display.id, campaignSessionId: e.campaignSessionId, campaignId: e.campaignId, creativeId: e.creativeId, playbackStartedAt: started, playbackEndedAt: ended, expectedDuration: e.expectedDuration ?? actual ?? 1, actualDuration: actual, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion ?? e.appVersion, playbackCompleted: e.playbackCompleted ?? e.success ?? false, status: (e.playbackCompleted ?? e.success) && (actual ?? 0) >= Math.floor((e.expectedDuration ?? actual ?? 1) * 0.9) ? 'VALID' : 'PARTIAL' } });
        }
        else {
            await prisma.playbackEvent.create({ data: { eventId: e.eventId ?? e.proofId ?? randomSecret(), displayId: display.id, campaignId: e.campaignId, creativeId: e.creativeId, eventType: 'CREATIVE_COMPLETED', occurredAt: ended ?? started, duration: actual, manifestVersion: e.manifestVersion, playerVersion: e.playerVersion ?? e.appVersion } }).catch((error) => error?.code === 'P2002' ? null : Promise.reject(error));
        }
        accepted += 1;
    }
    return ok(request, { accepted }, reply);
});
app.get('/api/earnings/summary', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const rows = await prisma.earningEntry.findMany({ where: { driverId: d.id } }); const sum = (status) => rows.filter((r) => !status || r.status === status).reduce((n, r) => n + r.amountMinor, 0n); return ok(request, { availableBalanceMinor: sum('AVAILABLE').toString(), pendingBalanceMinor: sum('PENDING').toString(), lifetimeEarningsMinor: sum().toString(), currency: 'INR' }, reply); });
app.get('/api/earnings/ledger', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, asJson(await prisma.earningEntry.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' } })), reply); });
app.get('/api/wallet', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const rows = await prisma.earningEntry.findMany({ where: { driverId: d.id } }); const available = rows.filter((r) => r.status === 'AVAILABLE').reduce((n, r) => n + r.amountMinor, 0n); const pending = rows.filter((r) => r.status === 'PENDING').reduce((n, r) => n + r.amountMinor, 0n); return ok(request, { availableBalanceMinor: available.toString(), pendingBalanceMinor: pending.toString(), currency: 'INR' }, reply); });
app.post('/api/payout-methods', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ type: z.enum(['UPI', 'BANK']), value: z.string().min(4) })); return ok(request, await prisma.payoutMethod.create({ data: { driverId: d.id, type: input.type, maskedValue: `${input.value.slice(0, 2)}***${input.value.slice(-4)}`, secretRef: hashSecret(input.value), verified: false } }), reply); });
app.get('/api/payout-methods', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, await prisma.payoutMethod.findMany({ where: { driverId: d.id }, select: { id: true, type: true, maskedValue: true, verified: true, createdAt: true } }), reply); });
app.post('/api/payouts', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ payoutMethodId: z.string().uuid(), amountMinor: z.coerce.bigint(), idempotencyKey: z.string().min(8) })); const method = await prisma.payoutMethod.findFirst({ where: { id: input.payoutMethodId, driverId: d.id, verified: true } }); if (!method)
    throw notFound('Verified payout method not found'); const available = (await prisma.earningEntry.findMany({ where: { driverId: d.id, status: 'AVAILABLE' } })).reduce((n, r) => n + r.amountMinor, 0n); if (input.amountMinor < config.payoutMinimumMinor || input.amountMinor > available)
    throw new ApiError('INVALID_PAYOUT_AMOUNT', 'Payout amount is not available', 422); return ok(request, await prisma.payout.create({ data: { driverId: d.id, payoutMethodId: method.id, amountMinor: input.amountMinor, idempotencyKey: input.idempotencyKey, status: 'PROCESSING' } }), reply); });
app.get('/api/payouts', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); return ok(request, asJson(await prisma.payout.findMany({ where: { driverId: d.id }, orderBy: { createdAt: 'desc' } })), reply); });
app.post('/api/safety/incidents', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ type: z.string(), vehicleId: z.string().uuid().optional(), rideId: z.string().uuid().optional(), latitude: z.number().optional(), longitude: z.number().optional(), notes: z.string().optional() })); return ok(request, await prisma.safetyIncident.create({ data: { driverId: d.id, occurredAt: new Date(), ...input } }), reply); });
app.post('/api/roadside/requests', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ issueType: z.string(), vehicleId: z.string().uuid().optional(), latitude: z.number().optional(), longitude: z.number().optional() })); return ok(request, await prisma.roadsideRequest.create({ data: { driverId: d.id, ...input, provider: 'MOCK_PROVIDER' } }), reply); });
app.post('/api/support/tickets', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const input = bodyOf(request, z.object({ category: z.string(), description: z.string().min(1), rideId: z.string().optional(), displayId: z.string().optional(), vehicleId: z.string().optional() })); return ok(request, await prisma.supportTicket.create({ data: { driverId: d.id, ...input } }), reply); });
app.get('/api/agreements/required', async (request, reply) => ok(request, await prisma.agreementVersion.findMany({ where: { required: true }, orderBy: { createdAt: 'desc' } }), reply));
app.post('/api/agreements/:versionId/accept', async (request, reply) => { const auth = await requireAuth(request); const d = await driverFrom(auth); const { versionId } = request.params; return ok(request, await prisma.driverConsent.upsert({ where: { driverId_agreementVersionId: { driverId: d.id, agreementVersionId: versionId } }, update: { acceptedAt: new Date() }, create: { driverId: d.id, agreementVersionId: versionId } }), reply); });
const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE'];
app.get('/api/admin/drivers', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, asJson(await prisma.driver.findMany({ include: { user: true, vehicles: true } })), reply); });
app.get('/api/admin/vehicles', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, await prisma.vehicle.findMany({ include: { driver: { include: { user: true } }, displays: true } }), reply); });
app.get('/api/admin/displays', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, asJson(await prisma.display.findMany({ include: { vehicle: true, heartbeats: { orderBy: { occurredAt: 'desc' }, take: 1 } } })), reply); });
app.get('/api/admin/rides', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, asJson(await prisma.ride.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { verification: true, driver: { include: { user: true } } } })), reply); });
app.get('/api/admin/verifications', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, await prisma.rideVerification.findMany({ orderBy: { rideId: 'desc' }, include: { ride: true } }), reply); });
app.get('/api/admin/fraud', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, await prisma.fraudSignal.findMany({ orderBy: { createdAt: 'desc' }, take: 500 }), reply); });
app.get('/api/admin/proof-of-play', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, await prisma.proofOfPlay.findMany({ orderBy: { playbackStartedAt: 'desc' }, take: 500 }), reply); });
app.get('/api/admin/earnings', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, asJson(await prisma.earningEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })), reply); });
app.get('/api/admin/payouts', async (request, reply) => { await requireRoles(request, adminRoles); return ok(request, asJson(await prisma.payout.findMany({ orderBy: { createdAt: 'desc' }, take: 500 })), reply); });
app.post('/api/admin/drivers/:driverId/restrict', async (request, reply) => { const auth = await requireRoles(request, ['ADMIN', 'SUPER_ADMIN']); const { driverId } = request.params; const driver = await prisma.driver.findUnique({ where: { id: driverId } }); if (!driver)
    throw notFound('Driver not found'); await prisma.user.update({ where: { id: driver.userId }, data: { accountStatus: 'RESTRICTED' } }); await prisma.auditLog.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'DRIVER_RESTRICTED', entityType: 'Driver', entityId: driverId, requestId: request.id } }); return ok(request, { restricted: true }, reply); });
app.post('/api/admin/displays/:displayId/commands', async (request, reply) => { const auth = await requireRoles(request, ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']); const { displayId } = request.params; const input = bodyOf(request, z.object({ commandType: z.enum(['WAKE', 'SLEEP', 'START_SESSION', 'STOP_SESSION', 'SYNC_MANIFEST', 'HEALTH_CHECK', 'RESTART_PLAYER']), payload: z.record(z.string(), z.unknown()).optional() })); const display = await prisma.display.findUnique({ where: { id: displayId } }); if (!display)
    throw notFound('Display not found'); const command = await prisma.displayCommand.create({ data: { displayId, commandType: input.commandType, payload: input.payload, expiresAt: new Date(Date.now() + 120000) } }); await prisma.auditLog.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'DISPLAY_COMMAND_QUEUED', entityType: 'DisplayCommand', entityId: command.id, after: { commandType: input.commandType }, requestId: request.id } }); return ok(request, command, reply); });
app.setErrorHandler((error, request, reply) => { request.log.error({ err: error }, 'request failed'); const status = error instanceof ApiError ? error.statusCode : 500; const message = error instanceof Error ? error.message : 'Internal server error'; reply.status(status).send({ data: null, error: { code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : message }, requestId: request.id }); });
const address = await app.listen({ port: config.port, host: '0.0.0.0' });
app.log.info(`OORO API listening at ${address}`);
process.on('SIGINT', async () => { await app.close(); await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await app.close(); await prisma.$disconnect(); process.exit(0); });
