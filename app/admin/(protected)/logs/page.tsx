import { redirect } from "next/navigation";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { AuditReport } from "@/components/admin/operations-reports";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const admin = await getAuthenticatedAdmin({ refreshSession: false });
    if (!canAdmin(admin.role, "operations:write")) redirect("/unauthorized");
    return <AuditReport />;
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) redirect("/admin/login");
    if (error instanceof AdminAuthError && error.status === 403) redirect("/unauthorized");
    throw error;
  }
}
