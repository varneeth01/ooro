import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";

export async function GET() {
  try {
    await webPrisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ web: "ok", database: "ok" });
  } catch (error) {
    console.error("Web database health check failed", {
      prismaCode: error && typeof error === "object" && "code" in error ? error.code : "UNKNOWN",
      errorClass: error instanceof Error ? error.constructor.name : "UnknownError",
    });
    return NextResponse.json({ web: "ok", database: "unavailable", error: "AUTH_STORE_UNAVAILABLE" }, { status: 503 });
  }
}
