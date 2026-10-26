import Link from "next/link";
type Props={accountType:string; pendingApproval?:boolean};
export function AdvertiserAccessNotice({accountType,pendingApproval=false}:Props){
const network=accountType==="NETWORK";const explorer=accountType==="EXPLORER";
const onboarding=accountType.toLowerCase();
return <div className="mx-auto max-w-3xl space-y-6 py-10">
 <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">OORO · Workspace access</p>
 <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{pendingApproval?"Your advertising workspace is being reviewed":network?"You're signed into a network partner account":"Campaign tools belong to advertiser accounts"}</h1>
 <p className="max-w-xl text-sm leading-7 text-neutral-600">{pendingApproval?"Your organization needs verification before campaign management is available. Your account is preserved; no additional account has been created.":network?"Network partners manage vehicles and screen participation. Campaign booking is available to separate Business, Brand, and Agency accounts.":explorer?"Explorer accounts can browse the network, but do not have campaign booking permissions.":"Your current account does not have campaign booking access."}</p>
 <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
  <Link href={pendingApproval?`/onboarding/${onboarding}`:network?"/onboarding/network":"/locations"} className="rounded-lg border border-neutral-200 p-4 transition hover:border-black"><strong className="block text-sm">{pendingApproval?"Review your organization":network?"Continue network onboarding":"Explore OORO coverage"}</strong><span className="mt-2 block text-xs text-neutral-500">Continue using your existing account</span></Link>
  <Link href="/signup" className="rounded-lg border border-neutral-200 p-4 transition hover:border-black"><strong className="block text-sm">Advertise with a different account</strong><span className="mt-2 block text-xs text-neutral-500">Choose Business, Brand or Agency when registering</span></Link>
 </div>
 <p className="text-xs text-neutral-500">Access is enforced by OORO's server, not just by the menu. Contact support if your account type was selected incorrectly.</p>
 </div>;
}
