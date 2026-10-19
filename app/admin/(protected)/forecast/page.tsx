import { PageHeader } from "@/components/app/app-ui";
import { ForecastSettings } from "@/components/admin/forecast-settings";
export default function AdminForecastPage() { return <div className="space-y-8"><PageHeader title="Forecast settings" description="Configure the transparent planning assumptions used by self-serve delivery estimates."/><ForecastSettings/></div>; }
