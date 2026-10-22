import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { backendApiUrl } from "@/lib/backend-url";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { hasAdminPermission, type AdminPermission } from "@/apps/api/src/domain/admin-auth";

type TokenSet = { accessToken: string; refreshToken: string };
type BackendAuth = { userId: string; role: string; driverId?: string };

export class AdminAuthError extends Error {
  constructor(public readonly code: "ADMIN_AUTH_REQUIRED" | "ADMIN_ACCESS_DENIED" | "SESSION_EXPIRED" | "ADMIN_BACKEND_UNAVAILABLE", public readonly status: 401 | 403 | 502) { super(code); }
}

const sessionKey = () => {
  const secret = process.env.OORO_SESSION_SECRET || (process.env.NODE_ENV !== "production" ? process.env.JWT_SECRET : undefined);
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) throw new AdminAuthError("ADMIN_BACKEND_UNAVAILABLE", 502);
  return createHash("sha256").update(secret || "ooro-local-session-secret").digest();
};
const encode = (value: Buffer) => value.toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url");

function seal(tokens: TokenSet) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
  return [encode(iv), encode(cipher.getAuthTag()), encode(encrypted)].join(".");
}

function unseal(value: string): TokenSet | null {
  try {
    const [iv, tag, encrypted] = value.split("."); if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(), decode(iv)); decipher.setAuthTag(decode(tag));
    const raw = Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString("utf8");
    const tokens = JSON.parse(raw) as Partial<TokenSet>;
    return typeof tokens.accessToken === "string" && typeof tokens.refreshToken === "string" ? tokens as TokenSet : null;
  } catch { return null; }
}

export async function saveBackendSession(tokens: TokenSet) {
  (await cookies()).set(SESSION_COOKIE, seal(tokens), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearBackendSession() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  const tokens = value ? unseal(value) : null;
  if (tokens) {
    try {
      await fetch(backendUrl("/api/auth/logout"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: tokens.refreshToken }), cache: "no-store" });
    } catch { /* Local cookie removal must still complete when the API is unavailable. */ }
  }
  cookieStore.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
}

const configuredBackendUrl = backendApiUrl;
const backendUrl = (path: string) => {
  const base = configuredBackendUrl();
  if (!base) throw new AdminAuthError("ADMIN_BACKEND_UNAVAILABLE", 502);
  return `${base}${path}`;
};

async function backendAuth(path: string, token: string) {
  const response = await fetch(backendUrl(path), { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new AdminAuthError(response.status === 403 ? "ADMIN_ACCESS_DENIED" : response.status === 401 ? "SESSION_EXPIRED" : "ADMIN_BACKEND_UNAVAILABLE", response.status === 403 ? 403 : response.status === 401 ? 401 : 502);
  const payload = await response.json() as { data?: BackendAuth };
  return payload.data ?? payload as unknown as BackendAuth;
}

async function refresh(tokens: TokenSet) {
  const response = await fetch(backendUrl("/api/auth/refresh"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ refreshToken: tokens.refreshToken }), cache: "no-store" });
  if (!response.ok) throw new AdminAuthError("SESSION_EXPIRED", 401);
  const payload = await response.json() as { data?: TokenSet };
  const next = payload.data ?? payload as unknown as TokenSet;
  if (!next.accessToken || !next.refreshToken) throw new AdminAuthError("SESSION_EXPIRED", 401);
  await saveBackendSession(next); return next;
}

export async function getAuthenticatedAdmin({ refreshSession = true } = {}) {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) throw new AdminAuthError("ADMIN_AUTH_REQUIRED", 401);
  const tokens = unseal(value);
  if (!tokens) throw new AdminAuthError("SESSION_EXPIRED", 401);
  let current = tokens;
  let auth: BackendAuth;
  try { auth = await backendAuth("/api/auth/session", current.accessToken); }
  catch (error) {
    if (!(error instanceof AdminAuthError)) throw new AdminAuthError("ADMIN_BACKEND_UNAVAILABLE", 502);
    if (error.status !== 401 || !refreshSession) throw error;
    current = await refresh(current); auth = await backendAuth("/api/auth/session", current.accessToken);
  }
  if (!["ADMIN", "SUPER_ADMIN", "OPERATIONS", "SUPPORT", "FINANCE"].includes(auth.role)) throw new AdminAuthError("ADMIN_ACCESS_DENIED", 403);
  return { accessToken: current.accessToken, role: auth.role, userId: auth.userId };
}

export async function requireAdminPermission(permission: AdminPermission, options?: { refreshSession?: boolean }) {
  const admin = await getAuthenticatedAdmin(options);
  if (!hasAdminPermission(admin.role, permission)) throw new AdminAuthError("ADMIN_ACCESS_DENIED", 403);
  return admin;
}

export async function proxyAdminRequest(path: string, init: RequestInit = {}) {
  const admin = await getAuthenticatedAdmin();
  const headers = new Headers(init.headers); headers.set("authorization", `Bearer ${admin.accessToken}`);
  let response = await fetch(backendUrl(path), { ...init, headers, cache: "no-store" });
  if (response.status === 401) {
    const value = (await cookies()).get(SESSION_COOKIE)?.value; const tokens = value ? unseal(value) : null;
    if (!tokens) throw new AdminAuthError("SESSION_EXPIRED", 401);
    const next = await refresh(tokens); headers.set("authorization", `Bearer ${next.accessToken}`);
    response = await fetch(backendUrl(path), { ...init, headers, cache: "no-store" });
  }
  return response;
}

export const adminDiagnostics = (values: Record<string, boolean | string>) => console.info("[admin/auth] sanitized diagnostics", values);
