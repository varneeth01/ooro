import { PlanAccess } from "@/components/marketing/advertiser-journeys";
import { PageHeader } from "@/components/app/app-ui";
export default function PlanPage() { return <div className="space-y-8"><PageHeader eyebrow="Commercial access" title="Choose your OORO plan" description="Self-serve pricing is public. Brand and Agency pricing is returned only after server-side verification."/><PlanAccess/></div>; }
