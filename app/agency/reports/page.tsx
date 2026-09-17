import { PageHeader, EmptyState } from "@/components/app/app-ui";
export default function AgencyReportsPage() { return <div className="space-y-8"><PageHeader title="Client reports" description="Consolidated delivery and Proof-of-Play reporting."/><EmptyState title="No reports yet." description="Reports become available when client campaigns deliver verified plays."/></div>; }
