import Link from "next/link";
import { MapPin } from "lucide-react";
import { Brand } from "../brand";
const navGroups=[
 {title:"Advertise",links:[["For brands","/for-brands"],["For agencies","/for-agencies"],["Bengaluru coverage","/coverage"]]},
 {title:"Explore",links:[["How it works","/how-it-works"],["Methodology","/methodology"],["Our team","/about"]]},
 {title:"Information",links:[["Privacy","/privacy"],["Terms","/terms"],["Sign in","/login"]]},
 {title:"Company",links:[["About OORO","/about"],["Campaign enquiries","/advertise"]]},
] as const;
export function Footer(){
 return <footer className="relative bg-[#080a09] text-white" aria-label="Site footer">
  <div className="container-ooro border-t border-white/10 pb-8 pt-16 sm:pt-20">
   <div className="grid gap-12 border-b border-white/10 pb-16 lg:grid-cols-[1.1fr_1.4fr]">
    <div><Brand dark/><p className="mt-7 max-w-xs text-sm leading-7 text-neutral-300">Digital advertising inside everyday auto journeys. Built in Bengaluru for businesses ready to show up in the real world.</p></div>
    <nav aria-label="Footer navigation" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{navGroups.map(group=><div key={group.title}><h3 className="text-sm font-semibold text-white">{group.title}</h3><ul className="mt-5 space-y-2">{group.links.map(([name,href])=><li key={href}><Link href={href} className="inline-flex min-h-11 items-center rounded-sm py-1 text-sm text-neutral-300 transition hover:text-[#dfff00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">{name}</Link></li>)}</ul></div>)}</nav>
   </div>
   <div className="flex flex-wrap items-center justify-between gap-5 pt-7 text-xs text-neutral-400"><span>© 2026 OORO. Mobility advertising designed for the real world.</span><span className="inline-flex items-center gap-2"><MapPin size={14} aria-hidden="true"/> Bengaluru, Karnataka · India</span></div>
  </div>
 </footer>;
}
