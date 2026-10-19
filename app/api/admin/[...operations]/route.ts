import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";
const allowed = new Set(["scheduler", "scheduler/check", "scheduler/publish", "screen-groups", "overview", "proof-of-play", "audit-log", "network"]);
async function handle(request: Request, { params }: { params: Promise<{ operations: string[] }> }) {
 const requestId = randomUUID(); const path = (await params).operations.join("/");
 if (!allowed.has(path)) return NextResponse.json({error:{message:"Not found"}},{status:404});
 try {
  const response = await proxyAdminRequest(`/api/admin/${path}${new URL(request.url).search}`, { method: request.method, headers: {"content-type":"application/json", "x-request-id":requestId}, ...(request.method === "GET" ? {} : { body: await request.text() }) });
  return NextResponse.json(await response.json(), { status:response.status });
 } catch(error) {
  console.error("[admin/operations] request failed", {requestId,path,errorType:error instanceof Error?error.name:"unknown"});
  return NextResponse.json({error:{message:error instanceof AdminAuthError?error.code:"Operations service unavailable"},requestId},{status:error instanceof AdminAuthError?error.status:502});
 }
}
export { handle as GET, handle as POST };
