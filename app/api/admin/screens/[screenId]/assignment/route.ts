import { NextResponse } from "next/server";
import { AdminAuthError, proxyAdminRequest } from "@/lib/auth/backend-session";

export async function PATCH(request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params;
    const response = await proxyAdminRequest(`/api/admin/displays/${screenId}/assignment`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: await request.text(),
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status });
  }
}
