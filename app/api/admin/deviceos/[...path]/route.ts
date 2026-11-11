import { handleDeviceOsAdminRequest } from "@/lib/admin/deviceos-route-handler";

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: Context) {
  return handleDeviceOsAdminRequest(request, context.params);
}

export async function POST(request: Request, context: Context) {
  return handleDeviceOsAdminRequest(request, context.params);
}
