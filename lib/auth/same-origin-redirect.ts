import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_ORIGIN = "https://theooro.com";
const PUBLIC_HOSTS = new Set([
  "theooro.com",
  "www.theooro.com",
  "ooro.media",
  "www.ooro.media",
  "ooro.network",
  "www.ooro.network",
  "ooro.digital",
  "www.ooro.digital",
  "oroo.tech",
  "www.oroo.tech",
]);

function trustedPublicHost(request: NextRequest): string | null {
  const candidates = [
    request.headers.get("x-forwarded-host"),
    request.headers.get("host"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const hostname = new URL(`https://${candidate.split(",")[0].trim()}`).hostname.toLowerCase();
      if (PUBLIC_HOSTS.has(hostname)) return hostname;
    } catch {
      // Ignore malformed proxy headers and continue to the next source.
    }
  }
  return null;
}

/**
 * Return a valid absolute redirect URL without trusting an internal proxy
 * origin such as 0.0.0.0:8080 or allowing a caller-controlled external host.
 */
export function sameOriginRedirect(path: string, request: NextRequest): NextResponse {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\r\n]/.test(path)) {
    throw new Error("Invalid same-origin redirect path");
  }
  const publicHost = trustedPublicHost(request);
  const origin = process.env.NODE_ENV === "production"
    ? (publicHost ? `https://${publicHost}` : CANONICAL_ORIGIN)
    : request.nextUrl.origin;
  const response = NextResponse.redirect(new URL(path, origin), 307);
  response.headers.set("cache-control", "no-store");
  return response;
}
