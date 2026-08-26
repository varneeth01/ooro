import type { AdminRole, AdminUser } from "./types";

export function getCurrentUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("ooro.current-user");
    if (raw) return JSON.parse(raw) as AdminUser;
  } catch { /* fall through to explicit mock mode */ }
  if (process.env.NEXT_PUBLIC_DEVICE_DATA_SOURCE === "mock") return { id: "mock-admin", name: "OORO Admin", role: "SUPER_ADMIN" };
  return null;
}

export function canAccessAdmin(user: AdminUser | null): boolean { return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN"; }
export const canManageScreens = canAccessAdmin;
export const canViewDeviceHealth = canAccessAdmin;
export function isAdminRole(role: AdminRole): boolean { return role === "SUPER_ADMIN" || role === "ADMIN"; }
