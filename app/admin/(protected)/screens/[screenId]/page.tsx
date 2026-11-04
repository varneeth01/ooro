import { ScreenDetailPage } from "@/components/admin/screen-detail-page";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";
export default async function Page({ params }: { params: Promise<{ screenId: string }> }) { const admin = await getAuthenticatedAdmin(); return <ScreenDetailPage screenId={(await params).screenId} canManage={canAdmin(admin.role, "device:write")}/>; }
