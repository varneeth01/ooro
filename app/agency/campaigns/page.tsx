import { PageHeader } from "@/components/app/app-ui";
import { AgencyCampaigns } from "@/components/agency/agency-workspace";
export default function AgencyCampaignsPage() { return <div className="space-y-8"><PageHeader title="Client campaigns" description="Create campaigns using approved Agency pricing and a persisted pricing snapshot."/><AgencyCampaigns/></div>; }
