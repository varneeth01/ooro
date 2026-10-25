import { ArrowUpRight } from "lucide-react";
import { HeroProduct } from "@/components/marketing/product/hero-product";
import { Navbar } from "@/components/marketing/navbar";
import { Bengaluru, HowItWorks, Network, Cities, Brands, About, Founders, FinalCta } from "@/components/marketing/sections";
import { CampaignPricing } from "@/components/marketing/campaign-pricing";
import { Footer } from "@/components/marketing/footer";
import { JourneyCards } from "@/components/marketing/advertiser-journeys";

export const metadata = { title: "In-auto & cab digital advertising in Bengaluru", alternates: { canonical: "/" }, description: "OORO is a smart mobility advertising network led by Varneeth Varma Nandimandalam, Siri Girish and Jay Chandrudu Thammadi. Discover in-vehicle advertising in Bengaluru." };

export default function Home() {
  return <main><div className="hero-ambient overflow-hidden text-white"><Navbar/><section className="container-ooro grid min-h-[700px] items-center gap-14 pb-12 pt-28 lg:grid-cols-[.85fr_1.15fr] lg:gap-20 lg:pb-14 lg:pt-32"><div className="min-w-0"><div className="eyebrow mb-8 text-neutral-400">Connected physical media for moving cities</div><h1 className="display max-w-2xl text-[42px] font-medium leading-[.98] sm:text-7xl lg:text-[84px]">Put your brand<br/><span className="text-[var(--brand-yellow)]">in motion.</span></h1><p className="mt-9 max-w-lg text-lg leading-8 text-neutral-400">Reach passengers across OORO&apos;s connected mobility advertising network, with verified playback and campaign-specific engagement.</p><div className="mt-10 flex flex-wrap items-center gap-3"><a href="/advertise" className="focus-ring rounded-[8px] bg-[var(--brand-yellow)] px-5 py-3.5 text-sm font-medium text-black">Start advertising <ArrowUpRight className="ml-8 inline" size={15}/></a><a href="/for-brands" className="focus-ring rounded-[8px] border border-white/25 px-5 py-3.5 text-sm font-medium text-white">I&apos;m a brand</a><a href="/for-agencies" className="focus-ring px-3 py-3.5 text-sm font-medium text-neutral-300">I&apos;m an agency</a></div></div><div className="relative min-w-0"><HeroProduct/></div></section><div className="container-ooro flex justify-between border-t border-white/10 py-5 text-[11px] tracking-[.08em] text-neutral-500"><span>STARTING IN BENGALURU / INDIA</span><span className="hidden sm:block">SMART PHYSICAL MEDIA / VERIFIED DELIVERY</span></div></div><JourneyCards/><Bengaluru/><CampaignPricing/><Network/><HowItWorks/><Cities/><Brands/><About/><Founders/><FinalCta/><Footer/></main>;
}
