import { PageHeader } from "@/components/app/app-ui";
import { AdBalancePanel } from "@/components/app/ad-balance-panel";
export default function AdBalancePage() { return <div className="space-y-8"><PageHeader eyebrow="Billing" title="OORO Ad Balance" description="Funds reserved for OORO advertising only."/><AdBalancePanel/></div>; }
