import { AdminCampaignsPage } from "@/components/admin/campaigns-page";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";
export default async function Page() { const admin = await getAuthenticatedAdmin(); return <AdminCampaignsPage canManage={canAdmin(admin.role, "campaign:update")}/>; }
