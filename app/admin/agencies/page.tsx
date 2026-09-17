import { PageHeader } from "@/components/app/app-ui";
import { AgencyPipeline } from "@/components/admin/agency-pipeline";
export default function AdminAgenciesPage() { return <div className="space-y-8"><PageHeader title="Agencies" description="Manage agency sales stages, ownership and follow-up."/><AgencyPipeline/></div>; }
