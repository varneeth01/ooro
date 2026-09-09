import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { WEB_SESSION_COOKIE } from "@/lib/auth/session";
import { webPrisma } from "@/lib/web-prisma";

export async function webOwnerEmail() {
  const raw = (await cookies()).get(WEB_SESSION_COOKIE)?.value ?? "";
  if (!raw) return null;
  const session = await webPrisma.webSession.findUnique({ where: { tokenHash: createHash("sha256").update(raw).digest("hex") } }).catch(() => null);
  if (!session || session.expiresAt <= new Date()) return null;
  return session.ownerEmail;
}
