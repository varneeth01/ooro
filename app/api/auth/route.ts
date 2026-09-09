import { NextResponse } from "next/server";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { WEB_SESSION_COOKIE } from "@/lib/auth/session";
import { testUsers } from "@/lib/auth/test-users";
import { webPrisma } from "@/lib/web-prisma";

function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`; }
function verifyPassword(password: string, stored: string) { const [salt, digest] = stored.split(":"); if (!salt || !digest) return false; const expected = Buffer.from(digest, "hex"); const actual = scryptSync(password, salt, 64); return expected.length === actual.length && timingSafeEqual(expected, actual); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const accountType = String(body?.accountType || "").trim().toUpperCase();
  const name = String(body?.name || "").trim();
  if (!email.includes("@") || password.length < 8) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  let resolvedAccount: { name: string } | null = null;
  if (accountType) {
    if (!["BRAND", "BUSINESS", "NETWORK", "EXPLORER"].includes(accountType) || !name) return NextResponse.json({ error: "Account type and name are required" }, { status: 400 });
    try { const created = await webPrisma.webAccount.create({ data: { email, passwordHash: hashPassword(password), name, accountType } }); resolvedAccount = created; }
    catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 }); return NextResponse.json({ error: "Account could not be created" }, { status: 503 }); }
  } else {
    let account = await webPrisma.webAccount.findUnique({ where: { email } }).catch(() => null);
    const validPersisted = Boolean(account && verifyPassword(password, account.passwordHash));
    const validDevelopmentTest = process.env.NODE_ENV !== "production" && testUsers.some(user => user.email === email && user.password === password);
    if (!validPersisted && !validDevelopmentTest) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    if (!account && validDevelopmentTest) { const testUser = testUsers.find(user => user.email === email); if (testUser) account = await webPrisma.webAccount.upsert({ where: { email }, create: { email, passwordHash: hashPassword(password), name: testUser.name, accountType: testUser.role }, update: {} }); }
    resolvedAccount = account;
  }
  const token = randomBytes(32).toString("hex");
  await webPrisma.webSession.create({ data: { tokenHash: createHash("sha256").update(token).digest("hex"), ownerEmail: email, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
  const response = NextResponse.json({ ok: true, user: { email, name: resolvedAccount?.name ?? name, accountType: accountType || undefined } });
  response.cookies.set(WEB_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

export async function DELETE(request: Request) { const raw = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith(`${WEB_SESSION_COOKIE}=`))?.slice(WEB_SESSION_COOKIE.length + 1); if (raw) await webPrisma.webSession.deleteMany({ where: { tokenHash: createHash("sha256").update(raw).digest("hex") } }); const response = NextResponse.json({ ok: true }); response.cookies.set(WEB_SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" }); return response; }
