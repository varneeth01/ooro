import { PageHeader, EmptyState } from "@/components/app/app-ui";
export default function AgencyBillingPage() { return <div className="space-y-8"><PageHeader title="Agency billing" description="Consolidated billing for approved agency media activity."/><EmptyState title="No agency billing records yet." description="Billing records appear after approved campaigns are invoiced or paid."/></div>; }
