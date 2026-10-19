import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

const allowed = [
  /^devices$/,
  /^devices\/[^/]+\/inventory$/,
  /^devices\/[^/]+\/revoke$/,
  /^devices\/[^/]+\/rotate-credential$/,
  /^telemetry$/,
  /^audit-logs$/,
  /^applications$/,
  /^applications\/[^/]+\/allowlist$/,
  /^applications\/[^/]+\/releases$/,
  /^releases\/[^/]+\/approve$/,
  /^deployments$/,
  /^deployments\/[^/]+$/,
  /^deployments\/[^/]+\/(pause|resume)$/,
];

async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  if (!allowed.some(pattern => pattern.test(path))) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    const headers: Record<string, string> = { "content-type": "application/json" };
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    const response = await proxyAdminRequest(`/api/admin/deviceos/${path}${new URL(request.url).search}`, { method: request.method, headers, ...(body === undefined ? {} : { body }) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { code: error instanceof AdminAuthError ? error.code : "DEVICEOS_BACKEND_UNAVAILABLE", message: error instanceof AdminAuthError ? error.code : "DeviceOS service unavailable" } }, { status });
  }
}

export { handle as GET, handle as POST };
