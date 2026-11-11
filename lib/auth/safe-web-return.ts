/** Only allow browser navigation to paths on the current OORO origin. */
export function safeWebReturnPath(input: string | null | undefined, fallback = "/dashboard"): string {
  if (!input || !input.startsWith("/") || input.startsWith("//") || input.includes("\\") || /[\u0000-\u001f\u007f]/.test(input)) return fallback;
  try {
    const parsed = new URL(input, "https://theooro.com");
    if (parsed.origin !== "https://theooro.com") return fallback;
    if (parsed.pathname.startsWith("/api/") || parsed.pathname.startsWith("/admin/") || parsed.pathname === "/admin") return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
