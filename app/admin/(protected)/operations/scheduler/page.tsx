import { redirect } from "next/navigation";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { AdminAuthError } from "@/lib/auth/backend-session";
import { OperationsScheduler } from "@/components/admin/operations-scheduler";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";

export default async function Page({ searchParams }: { searchParams: Promise<{ campaignId?: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin({ refreshSession: false });
    if (!canAdmin(admin.role, "campaign:schedule")) redirect("/unauthorized");
    const { campaignId } = await searchParams;
    return <OperationsScheduler canOverrideInventory={admin.role === "SUPER_ADMIN"} initialCampaignId={campaignId} />;
  } catch (error) {
    if (error instanceof AdminAuthError && error.status === 401) redirect("/admin/login");
    if (error instanceof AdminAuthError && error.status === 403) redirect("/unauthorized");
    throw error;
  }
}
