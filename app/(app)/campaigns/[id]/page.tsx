import { CampaignDetail } from "@/components/app/campaign-detail";
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) { return <CampaignDetail id={(await params).id}/>; }
