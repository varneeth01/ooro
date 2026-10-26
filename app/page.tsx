import Link from "next/link";
import { ArrowUpRight, CheckCircle2, MapPin, PlayCircle, Sparkles } from "lucide-react";
import { HeroProduct } from "@/components/marketing/product/hero-product";
import { HeroReveal } from "@/components/marketing/hero-reveal";
import { ImmersiveShowcase } from "@/components/marketing/immersive-showcase";
import { ExperienceBento } from "@/components/marketing/experience-bento";
import { Navbar } from "@/components/marketing/navbar";
import { Cities, Founders, FinalCta } from "@/components/marketing/sections";
import { CampaignPricing } from "@/components/marketing/campaign-pricing";
import { Footer } from "@/components/marketing/footer";
import { JourneyCards } from "@/components/marketing/advertiser-journeys";

export const metadata = {title:"Auto & cab screen advertising in Bengaluru",alternates:{canonical:"/"},description:"Plan mobility advertising on screens inside autos and cabs in Bengaluru. OORO connects local businesses, brands and agencies to offline audiences with operational review and proof-of-play reporting."};
export default function Home(){
 return <main id="main-content" className="overflow-x-clip">
   <div className="relative overflow-hidden bg-[#090b09] text-white"><div className="pointer-events-none absolute -right-56 top-20 h-[650px] w-[650px] rounded-full bg-[#dfff00]/[.07] blur-[110px]"/><Navbar/>
    <section className="container-ooro relative grid min-h-[min(900px,100svh)] items-center gap-12 pb-16 pt-36 lg:grid-cols-[.92fr_1.08fr] lg:gap-12 lg:pb-24 lg:pt-40">
     <div className="min-w-0">
      <div className="inline-flex items-center rounded-full border border-white/15 bg-white/[.06] px-3.5 py-2 text-[11px] font-semibold tracking-[.08em] text-neutral-200">BENGALURU · MOBILITY ADVERTISING</div>
      <HeroReveal/>
      <p className="mt-7 max-w-[510px] text-base leading-8 text-neutral-400 sm:text-lg">Make the journey your next advertising opportunity. Reach local audiences through OORO screens inside autos and cabs.</p>
      <div className="mt-9 flex flex-wrap items-center gap-3"><Link href="/advertise" className="inline-flex min-h-12 items-center justify-between gap-8 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black shadow-[0_0_42px_rgba(255,255,255,.12)] transition hover:bg-[#dfff00] hover:shadow-[0_0_50px_rgba(223,255,0,.2)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">Plan your campaign <ArrowUpRight size={18}/></Link><Link href="/how-it-works" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]"><PlayCircle size={17}/> See how it works</Link></div>
      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs text-neutral-400"><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#dfff00]"/> Location-led campaign planning</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-[#dfff00]"/> Proof-of-play reporting</span></div>
     </div>
     <div className="relative min-w-0"><div className="absolute -inset-5 rounded-[38px] border border-white/[.07]"/><div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#161616] p-2 shadow-[0_45px_100px_rgba(0,0,0,.4)] sm:p-3"><HeroProduct/></div><div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.055] px-4 py-3 text-xs text-neutral-300"><span className="inline-flex items-center gap-2"><MapPin size={14} className="text-[#dfff00]"/> Bengaluru, Karnataka</span><span>Display network illustration · not a live inventory count</span></div></div>
    </section>
   </div>
   <ImmersiveShowcase/><ExperienceBento/><JourneyCards/>
   <section className="bg-[#e9ecd9] py-16 sm:py-24"><div className="container-ooro grid items-center gap-9 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
    <div><span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold"><MapPin size={14}/> FIRST LAUNCH MARKET</span><h2 className="mt-6 text-4xl font-semibold tracking-[-.06em] sm:text-6xl">Made for the way <span className="text-[#5c6736]">Bengaluru moves.</span></h2><p className="mt-6 max-w-md text-base leading-8 text-[#505449]">From BTM Layout to Koramangala and Indiranagar, plan advertising around the areas you want to reach. Screen availability is confirmed by OORO before booking.</p><Link href="/coverage" className="mt-7 inline-flex items-center gap-3 rounded-xl bg-black px-5 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800">Explore coverage <ArrowUpRight size={17}/></Link></div>
    <div className="grid grid-cols-2 gap-3 sm:gap-4"><div className="col-span-2 rounded-[24px] bg-[#101210] p-7 text-white sm:p-9"><Sparkles className="text-[#dfff00]" size={26}/><h3 className="mt-7 text-2xl font-semibold tracking-tight sm:text-3xl">Local attention.<br/>Real-world context.</h3><p className="mt-4 max-w-md text-sm leading-7 text-neutral-400">Mobility screens create space for messages inside everyday passenger journeys.</p></div><div className="rounded-[20px] border border-black/10 bg-white/70 p-5 sm:p-7"><p className="text-[11px] font-semibold tracking-widest text-neutral-500">TARGETING</p><p className="mt-6 text-xl font-semibold tracking-tight">Choose an area</p><p className="mt-2 text-xs leading-5 text-neutral-600">Neighborhood and radius preferences</p></div><div className="rounded-[20px] border border-black/10 bg-white/70 p-5 sm:p-7"><p className="text-[11px] font-semibold tracking-widest text-neutral-500">DELIVERY</p><p className="mt-6 text-xl font-semibold tracking-tight">Review first</p><p className="mt-2 text-xs leading-5 text-neutral-600">Confirm placement and commercial terms</p></div></div>
   </div></section>
   <CampaignPricing/><Cities/><Founders/><FinalCta/><Footer/>
 </main>;
}
