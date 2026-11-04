import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";
import { deviceOsProxyFailure, readDeviceOsJson } from "@/apps/api/src/domain/deviceos-proxy-response";

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

type Proxy = typeof proxyAdminRequest;

export async function handleDeviceOsAdminRequest(request: Request, params: Promise<{ path: string[] }>, proxy: Proxy = proxyAdminRequest) {
  const requestId = request.headers.get("x-request-id") || randomUUID();
  const path = (await params).path.join("/");
  if (!allowed.some(pattern => pattern.test(path))) return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    const headers: Record<string, string> = { "content-type": "application/json", "x-request-id": requestId };
    const idempotencyKey = request.headers.get("idempotency-key");
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    const response = await proxy(`/api/admin/deviceos/${path}${new URL(request.url).search}`, { method: request.method, headers, ...(body === undefined ? {} : { body }) });
    const result = await readDeviceOsJson(response, requestId);
    return NextResponse.json(result.body, { status: result.status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
  } catch (error) {
    const result = deviceOsProxyFailure(error instanceof AdminAuthError ? { status: error.status, code: error.code } : undefined, requestId);
    return NextResponse.json(result.body, { status: result.status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
  }
}
