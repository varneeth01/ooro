import { webContext } from "@/lib/web-owner";
import { AdvertiserAccessNotice } from "@/components/app/advertiser-access-notice";
import { Campaigns } from "@/components/app/campaigns";
export default async function CampaignsPage() {
 const context=await webContext();
 const type=context?.account.accountType;
 if (type==="NETWORK"||type==="EXPLORER") return <AdvertiserAccessNotice accountType={type}/>;
 if ((type==="BRAND"||type==="AGENCY") && context?.organization?.verificationStatus!=="VERIFIED") return <AdvertiserAccessNotice accountType={type} pendingApproval/>;
 return <Campaigns/>;
}
