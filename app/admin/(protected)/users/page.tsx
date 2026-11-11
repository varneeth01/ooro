import { redirect } from "next/navigation";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { AdminUsersPage } from "@/components/admin/admin-users-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const admin = await getAuthenticatedAdmin({ refreshSession: false });
    if (!canAdmin(admin.role, "admin-users:manage")) redirect("/unauthorized");
    return <AdminUsersPage actorId={admin.userId} />;
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) redirect("/admin/login");
    if (error instanceof AdminAuthError && error.status === 403) redirect("/unauthorized");
    throw error;
  }
}
