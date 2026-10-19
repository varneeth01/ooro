import { AdminCampaignEditor } from "@/components/admin/campaign-editor";
import { AdminCampaignAnalytics } from "@/components/admin/campaign-analytics";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const campaignId = (await params).id;
  return <div className="space-y-7"><AdminCampaignEditor campaignId={campaignId}/><AdminCampaignAnalytics campaignId={campaignId}/></div>;
}
