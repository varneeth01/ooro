import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clapperboard,
  MapPin,
  MoveRight,
  ShieldCheck,
  Store,
} from "lucide-react";
import { siteUrl } from "@/lib/site";
import { Footer } from "@/components/marketing/footer";
import { HeroReveal } from "@/components/marketing/hero-reveal";
import { ImmersiveShowcase } from "@/components/marketing/immersive-showcase";
import { Navbar } from "@/components/marketing/navbar";
import { HeroProduct } from "@/components/marketing/product/hero-product";
import { CityNetwork } from "@/components/marketing/city-network";
import { FinalCta, Founders } from "@/components/marketing/sections";

export const metadata: Metadata = {
  title: "Auto & Cab Screen Advertising in Bengaluru",
  description: "Plan digital advertising on screens inside autos and cabs across Bengaluru. OORO helps businesses, brands and agencies target local areas and review verified playback where available.",
  alternates: { canonical: "/" },
  keywords: ["auto advertising Bengaluru", "cab advertising Bengaluru", "in-auto screen advertising", "Bangalore local advertising", "mobility advertising India", "digital out of home Bengaluru", "OORO advertising"],
  openGraph: {
    title: "OORO | Advertising that moves through Bengaluru",
    description: "Reach people through digital screens inside everyday auto and cab journeys, with location-led planning and playback reporting where available.",
    url: "/",
    type: "website",
    images: [{ url: "/ooro-auto-screen.svg", width: 1200, height: 900, alt: "OORO in-auto digital advertising screen concept" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OORO | Advertising that moves through Bengaluru",
    description: "Plan location-led campaigns across OORO screens inside autos and cabs.",
    images: ["/ooro-auto-screen.svg"],
  },
};

const audiences = [
  { title: "Local businesses", description: "Plan around the Bengaluru neighborhoods where nearby customers already move.", action: "Plan a local campaign", href: "/advertise", Icon: Store },
  { title: "Brands", description: "Bring approved creative into real journeys and review supported delivery evidence.", action: "Explore brand advertising", href: "/for-brands", Icon: Building2 },
  { title: "Agencies", description: "Manage briefs, creatives and reporting for multiple clients from one workflow.", action: "Explore agency access", href: "/for-agencies", Icon: BriefcaseBusiness },
] as const;

const capabilities = [
  { title: "Plan around place", description: "Choose target areas, dates and a campaign radius. OORO confirms eligible inventory before booking.", Icon: MapPin },
  { title: "Control the creative", description: "Submit image or video artwork for review before approved media is scheduled to screens.", Icon: Clapperboard },
  { title: "Separate proof from estimates", description: "Review supported proof-of-play records without treating a schedule as evidence that an ad played.", Icon: ShieldCheck },
] as const;

const faqs = [
  { question: "What is OORO?", answer: "OORO is building a mobility advertising network using digital screens inside autos and cabs. It helps businesses, brands and agencies plan campaigns around real-world movement." },
  { question: "Where is OORO available?", answer: "Bengaluru is OORO's initial launch market. Screen and area availability is confirmed for each campaign before booking." },
  { question: "Can a campaign target specific Bengaluru areas?", answer: "You can request neighborhoods, a campaign radius, dates and daily hours. These are planning preferences; OORO confirms the eligible screens and commercial terms before launch." },
  { question: "How does OORO report delivery?", answer: "Where supported, OORO uses device-reported playback and proof-of-play events. Scheduled delivery and estimated reach are kept distinct from verified plays." },
] as const;

export default function Home() {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    mainEntity: faqs.map(item => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return <main id="main-content" className="overflow-x-clip bg-[#f5f6f1] text-[#0a0c0b]">
    <div className="relative overflow-hidden bg-[#080a09] text-white">
      <Navbar/>
      <section className="container-ooro relative grid min-h-[100svh] items-center gap-14 pb-14 pt-32 lg:grid-cols-[.9fr_1.1fr] lg:gap-16 lg:pb-20 lg:pt-28">
        <div className="relative z-10 min-w-0">
          <HeroReveal/>
          <p className="mt-7 max-w-[620px] text-lg leading-8 text-neutral-300 sm:text-xl">OORO puts approved brand stories inside everyday auto and cab journeys—planned around place, reviewed by people and reported with delivery evidence where available.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/advertise" className="inline-flex min-h-12 items-center justify-between gap-8 rounded-xl bg-[#dfff00] px-6 py-4 text-sm font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">Plan your campaign <ArrowUpRight size={18}/></Link>
            <Link href="/how-it-works" className="inline-flex min-h-12 items-center justify-between gap-8 rounded-xl border border-white/20 px-6 py-4 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">See how OORO works <MoveRight size={18}/></Link>
          </div>
          <div className="mt-10 grid gap-3 border-t border-white/10 pt-6 text-sm text-neutral-400 sm:grid-cols-2">
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#dfff00]"/> Bengaluru launch focus</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#dfff00]"/> Availability confirmed before booking</span>
          </div>
        </div>
        <div className="relative min-w-0 lg:pt-10"><HeroProduct/></div>
      </section>
      <div className="border-y border-white/10 bg-[#0c0f0e]">
        <div className="container-ooro grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {["Target areas and dates", "Creative review before scheduling", "Playback evidence where supported"].map((item, index) => <div key={item} className="flex items-center gap-4 py-5 text-sm text-neutral-300 sm:px-6 sm:first:pl-0"><span className="text-[#dfff00]">0{index + 1}</span><span>{item}</span></div>)}
        </div>
      </div>
    </div>

    <ImmersiveShowcase/>

    <section id="features" className="scroll-mt-20 bg-[#090b0a] py-20 text-white sm:py-28">
      <div className="container-ooro grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
        <div>
          <h2 className="landing-display max-w-xl text-4xl font-semibold leading-[1] tracking-[-.04em] sm:text-6xl">A campaign system built for the street, not another feed.</h2>
          <p className="mt-6 max-w-md text-base leading-8 text-neutral-400">Location-aware planning, real creative operations and honest delivery language—connected in one flow.</p>
          <Link href="/methodology" className="mt-8 inline-flex items-center gap-3 text-sm font-semibold text-[#dfff00] underline decoration-[#dfff00]/50 underline-offset-8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">Read the delivery methodology <ArrowUpRight size={17}/></Link>
        </div>
        <div className="border-t border-white/15">
          {capabilities.map(({ title, description, Icon }) => <article key={title} className="grid gap-5 border-b border-white/15 py-8 sm:grid-cols-[56px_1fr] sm:py-10">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#dfff00] text-black"><Icon size={22}/></span>
            <div><h3 className="text-2xl font-semibold tracking-[-.03em]">{title}</h3><p className="mt-3 max-w-xl text-base leading-7 text-neutral-400">{description}</p></div>
          </article>)}
        </div>
      </div>
    </section>

    <section id="solutions" className="scroll-mt-20 bg-[#f5f6f1] py-20 sm:py-28">
      <div className="container-ooro">
        <div className="grid gap-7 lg:grid-cols-[1fr_.75fr] lg:items-end">
          <h2 className="landing-display max-w-3xl text-4xl font-semibold leading-[1] tracking-[-.04em] sm:text-6xl">One moving network. Three ways to use it.</h2>
          <p className="max-w-md text-base leading-8 text-neutral-600">Start with the path that fits your business. Each route leads into the same campaign and delivery system.</p>
        </div>
        <div className="mt-14 border-t border-black/15">
          {audiences.map(({ title, description, action, href, Icon }) => <article key={title} className="group grid gap-5 border-b border-black/15 py-8 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:py-10">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-black text-[#dfff00]"><Icon size={24}/></span>
            <div><h3 className="text-2xl font-semibold tracking-[-.03em] sm:text-3xl">{title}</h3><p className="mt-2 max-w-xl text-base leading-7 text-neutral-600">{description}</p></div>
            <Link href={href} className="inline-flex min-h-12 items-center gap-3 justify-self-start rounded-xl border border-black/20 px-5 py-3 text-sm font-semibold transition group-hover:border-black group-hover:bg-black group-hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black sm:justify-self-end">{action}<ArrowUpRight size={17}/></Link>
          </article>)}
        </div>
      </div>
    </section>

    <section id="bengaluru" className="scroll-mt-20 border-y border-black/10 bg-[#e8edcb] py-20 sm:py-28">
      <div className="container-ooro grid gap-12 xl:grid-cols-[.72fr_1.28fr] xl:gap-16">
        <div className="xl:sticky xl:top-28 xl:self-start">
          <div className="inline-flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-[#657500]"/> Bengaluru launch market</div>
          <h2 className="landing-display mt-6 max-w-xl text-4xl font-semibold leading-[1] tracking-[-.04em] sm:text-6xl">Plan around the places that matter.</h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#4f5542]">Request neighborhoods such as BTM Layout, Koramangala, Indiranagar or Marathahalli. OORO checks eligible screens before confirming a campaign; area preferences do not guarantee inventory.</p>
          <Link href="/bengaluru" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2d2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">Explore Bengaluru advertising <ArrowUpRight size={17}/></Link>
        </div>
        <CityNetwork/>
      </div>
    </section>

    <Founders/>

    <section id="faq" className="bg-white py-20 sm:py-28">
      <div className="container-ooro grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
        <div><h2 className="landing-display text-4xl font-semibold leading-[1] tracking-[-.04em] sm:text-6xl">Questions before you move.</h2><p className="mt-6 max-w-md text-base leading-8 text-neutral-600">Clear answers about availability, targeting and delivery evidence.</p></div>
        <div className="border-t border-black/15">{faqs.map(item => <details key={item.question} className="group border-b border-black/15 py-6"><summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold marker:content-none"><span>{item.question}</span><span aria-hidden="true" className="text-[#657500] transition group-open:rotate-45">+</span></summary><p className="max-w-2xl pb-2 pt-4 text-base leading-8 text-neutral-600">{item.answer}</p></details>)}</div>
      </div>
    </section>

    <FinalCta/>
    <Footer/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}/>
  </main>;
}
