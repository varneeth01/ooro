import { webContext } from "@/lib/web-owner";
import { AdvertiserAccessNotice } from "@/components/app/advertiser-access-notice";
import { BusinessCampaignFlow } from "@/components/app/business-campaign-flow";
export default async function NewCampaignPage() {
 const context=await webContext();
 const type=context?.account.accountType;
 if (type==="NETWORK"||type==="EXPLORER") return <AdvertiserAccessNotice accountType={type}/>;
 if ((type==="BRAND"||type==="AGENCY") && context?.organization?.verificationStatus!=="VERIFIED") return <AdvertiserAccessNotice accountType={type} pendingApproval/>;
 return <BusinessCampaignFlow/>;
}
