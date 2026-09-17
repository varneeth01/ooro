import { AdminCampaignEditor } from "@/components/admin/campaign-editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AdminCampaignEditor campaignId={(await params).id}/>; }
