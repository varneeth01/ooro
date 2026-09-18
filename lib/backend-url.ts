import { apiUrl } from "@/lib/api-url";

export function backendApiUrl() {
  const configured = process.env.OORO_BACKEND_API_URL?.trim().replace(/\/$/, "") || apiUrl;
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "http://127.0.0.1:8080";
}
