import { NextResponse } from "next/server";

/**
 * Emit a relative HTTP Location so reverse-proxy internal addresses
 * (0.0.0.0:8080 / localhost) cannot leak into the browser.
 *
 * Callers supply a trusted application path, never an arbitrary URL.
 */
export function sameOriginRedirect(path: string): NextResponse {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\r\n]/.test(path)) {
    throw new Error("Invalid same-origin redirect path");
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: path, "cache-control": "no-store" },
  });
}
