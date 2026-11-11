import { OperationsOverview } from "@/components/admin/operations-reports";
import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/auth/backend-session";

export default async function Page(){
 const admin=await getAuthenticatedAdmin({refreshSession:false});
 return <OperationsOverview canViewFleet={canAdmin(admin.role,"device:read")} canViewCampaigns={canAdmin(admin.role,"campaign:read")} canSchedule={canAdmin(admin.role,"campaign:schedule")}/>;
}
