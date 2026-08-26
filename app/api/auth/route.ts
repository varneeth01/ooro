import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { testUsers } from "@/lib/auth/test-users";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email.includes("@") || password.length < 8) return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  if (!body?.accountType && !testUsers.some(user => user.email === email && user.password === password)) return NextResponse.json({ error: "Invalid test login" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, `${email}.${crypto.randomUUID()}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" }); return response; }
