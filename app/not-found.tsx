import Link from "next/link";
import { ArrowRight, Compass, Home, LifeBuoy, Megaphone, MapPin, Building2 } from "lucide-react";
import { Brand } from "@/components/brand";

export default function NotFound() {
 const options = [
  {title:"Plan advertising",description:"Plan a campaign on screens inside autos and cabs.",href:"/advertise",icon:Megaphone},
  {title:"Explore Bengaluru",description:"Understand our launch city and planned network.",href:"/coverage",icon:MapPin},
  {title:"For brands & agencies",description:"Find the right way to advertise with OORO.",href:"/for-brands",icon:Building2},
 ];
 return <main className="min-h-screen bg-[#f7f7f4] text-neutral-950">
  <header className="border-b border-neutral-200 bg-[#111] px-5 py-5 text-white sm:px-10"><div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" aria-label="OORO homepage"><Brand dark/></Link><Link href="/advertise" className="rounded-md border border-white/30 px-4 py-2 text-xs font-medium text-white hover:bg-white/10">Start advertising <ArrowRight size={13} className="ml-2 inline"/></Link></div></header>
  <div className="mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-10 sm:pt-24">
   <div className="max-w-2xl"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-neutral-500"><Compass size={16}/> Lost route · 404</div>
   <h1 className="mt-5 text-4xl font-medium tracking-[-.05em] sm:text-6xl">This page took a different route.</h1>
   <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600">The address might have changed, or this page may no longer be available. You can still explore OORO, plan a mobility campaign, or reach our team.</p>
   <div className="mt-8 flex flex-wrap gap-3"><Link href="/" className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-neutral-800"><Home size={16}/>Back to homepage</Link><Link href="/about" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-medium hover:border-black"><LifeBuoy size={16}/>About & team</Link></div></div>
   <section aria-labelledby="where-next" className="mt-14 border-t border-neutral-200 pt-8"><h2 id="where-next" className="text-lg font-medium">Where would you like to go?</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{options.map(option=><Link key={option.href} href={option.href} className="group rounded-xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-sm"><option.icon size={21} className="text-neutral-700"/><h3 className="mt-5 text-base font-medium">{option.title} <ArrowRight size={15} className="ml-1 inline transition-transform group-hover:translate-x-1"/></h3><p className="mt-2 text-sm leading-6 text-neutral-500">{option.description}</p></Link>)}</div></section>
   <p className="mt-12 text-xs text-neutral-500">If you followed an OORO link here, you may have found a broken link. Visit <Link href="/about" className="font-medium underline underline-offset-4">our team page</Link> for contact information.</p>
  </div>
 </main>;
}
