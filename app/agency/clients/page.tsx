import { PageHeader } from "@/components/app/app-ui";
import { AgencyClients } from "@/components/agency/agency-workspace";
export default function AgencyClientsPage() { return <div className="space-y-8"><PageHeader title="Clients" description="Create client workspaces and keep campaign delivery organised."/><AgencyClients/></div>; }
