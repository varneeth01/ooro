import { ScreensPage } from "@/components/admin/screens-page";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";
export default async function Page() { const admin = await getAuthenticatedAdmin(); return <ScreensPage canManage={canAdmin(admin.role, "device:write")}/>; }
