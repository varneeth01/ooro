import { jwtVerify, SignJWT } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { forbidden, unauthorized } from './errors.js';
const secret = new TextEncoder().encode(config.jwtSecret);
export const hashSecret = (value) => createHash('sha256').update(value).digest('hex');
export const randomSecret = (bytes = 32) => randomBytes(bytes).toString('hex');
export async function issueTokens(userId, role, driverId) {
    const accessToken = await new SignJWT({ role, ...(driverId ? { driverId } : {}) })
        .setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt()
        .setExpirationTime(`${config.accessTtlSeconds}s`).sign(secret);
    const refreshToken = randomSecret();
    await prisma.session.create({ data: { userId, refreshTokenHash: hashSecret(refreshToken), expiresAt: new Date(Date.now() + config.refreshTtlSeconds * 1000) } });
    return { accessToken, refreshToken };
}
export async function authenticate(request) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token)
        throw unauthorized();
    try {
        const verified = await jwtVerify(token, secret);
        return { userId: String(verified.payload.sub), role: String(verified.payload.role ?? 'DRIVER'), driverId: verified.payload.driverId ? String(verified.payload.driverId) : undefined };
    }
    catch {
        throw unauthorized('Invalid or expired access token');
    }
}
export async function requireAuth(request) { return authenticate(request); }
export async function requireRoles(request, roles) {
    const auth = await authenticate(request);
    if (!roles.includes(auth.role))
        throw forbidden();
    return auth;
}
export async function authenticateDisplay(request) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token)
        throw unauthorized('Device authentication required');
    const display = await prisma.display.findFirst({ where: { deviceTokenHash: hashSecret(token) } });
    if (!display)
        throw unauthorized('Invalid device credentials');
    return display;
}
export const response = (request, data) => ({ data, error: null, requestId: request.id });
