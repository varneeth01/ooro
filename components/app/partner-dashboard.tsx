import Link from "next/link";
import { ArrowRight, Compass, MonitorPlay, ShieldCheck } from "lucide-react";
export function PartnerDashboard({accountType}:{accountType:"NETWORK"|"EXPLORER"}){
 const network=accountType==="NETWORK";
 return <div className="mx-auto max-w-5xl space-y-7 py-4">
  <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-9">
   <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">{network?"OORO network partner":"OORO explorer"} workspace</p>
   <h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{network?"Welcome to OORO's mobility network":"Discover OORO in Bengaluru"}</h1>
   <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600">{network?"Your account is for vehicle, screen and mobility-network participation. Advertising campaigns belong to Business, Brand and Agency accounts.":"Explore OORO's Bengaluru launch, learn how mobility advertising works, and follow the network as it grows."}</p>
   <div className="mt-6 flex flex-wrap gap-3"><Link href={network?"/onboarding/network":"/locations"} className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">{network?"Continue partner onboarding":"Explore Bengaluru"}<ArrowRight size={16}/></Link><Link href="/settings" className="rounded-lg border border-neutral-300 px-5 py-3 text-sm font-medium">Manage profile</Link></div>
  </div>
  <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-neutral-200 bg-white p-6"><MonitorPlay size={22}/><h2 className="mt-4 text-lg font-medium">{network?"Your participation":"Where OORO operates"}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">{network?"Complete partner verification before any vehicle or screen is considered active. Hardware pairing and operational status are managed separately.":"Bengaluru is the initial OORO launch market. Specific placements and availability are reviewed for each request."}</p></div><div className="rounded-xl border border-neutral-200 bg-white p-6">{network?<ShieldCheck size={22}/>:<Compass size={22}/>}<h2 className="mt-4 text-lg font-medium">{network?"Partner verification":"Interested in advertising?"}</h2><p className="mt-2 text-sm leading-6 text-neutral-500">{network?"Your onboarding information is reviewed by OORO's operations team. A network account does not automatically grant advertiser access.":"Advertising bookings require a separate Business, Brand or Agency account and are subject to availability and approval."}</p></div></div>
 </div>;
}
