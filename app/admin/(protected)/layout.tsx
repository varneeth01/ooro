import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
export const dynamic = "force-dynamic";
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  try { await getAuthenticatedAdmin({ refreshSession: false }); }
  catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) redirect("/admin/login");
    if (error instanceof AdminAuthError && error.status === 403) redirect("/unauthorized");
    throw error;
  }
  return <AppShell variant="admin">{children}</AppShell>;
}
