import { BusinessCampaignDetail } from "@/components/app/business-campaign-detail";
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) { return <BusinessCampaignDetail id={(await params).id}/>; }
