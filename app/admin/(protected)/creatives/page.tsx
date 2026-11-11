import { CreativeLibrary } from "@/components/admin/creative-library";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";
export default async function Page() { const admin = await getAuthenticatedAdmin(); return <CreativeLibrary canManage={canAdmin(admin.role, "creative:write")}/>; }
