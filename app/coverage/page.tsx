import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CityNetwork } from "@/components/marketing/city-network";
import { PublicPage } from "@/components/marketing/public-page";
import { pageMetadata } from "@/lib/seo";
import { ContentFaq } from "@/components/marketing/content-faq";

export const metadata: Metadata = pageMetadata("coverage", "OORO Coverage and Campaign Availability", "Learn how OORO reviews preferred areas and confirms eligible inventory for each campaign request.");

export default function CoveragePage() {
  return <PublicPage eyebrow="Coverage / India" title="A city network built one verified screen at a time." description="Bengaluru is OORO's launch market. Explore the network roadmap below, then tell us the neighborhoods and dates that matter to your campaign. Eligible screens are confirmed before booking." primaryAction={{ href: "/advertise", label: "Share campaign areas" }} secondaryAction={{ href: "/bengaluru", label: "Explore Bengaluru advertising" }}>
    <section className="border-b border-black/10 bg-[#e8edcb] py-16 sm:py-24">
      <div className="container-ooro grid gap-10 lg:grid-cols-[.62fr_1.38fr] lg:gap-16">
        <div>
          <p className="text-sm font-semibold text-[#596944]">Bengaluru first</p>
          <h2 className="landing-display mt-5 text-4xl font-semibold leading-none tracking-[-.04em] sm:text-5xl">Request the places. We confirm the inventory.</h2>
          <p className="mt-6 text-base leading-8 text-[#4f5542]">Coverage is operational, not decorative: a city or neighborhood shown here is not a guarantee that a specific screen is available for every date. OORO verifies eligible inventory for each campaign.</p>
          <Link href="/bengaluru" className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2a2d2b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black">Explore Bengaluru advertising <ArrowUpRight size={17}/></Link>
        </div>
        <CityNetwork/>
      </div>
    </section>
  <ContentFaq title="Coverage and availability questions" items={[
 {question:"Does a Bengaluru neighborhood on the map guarantee a screen there?",answer:"No. A city or area shown for planning is not a promise of a specific vehicle, route, date or screen. OORO verifies eligible inventory for each campaign request."},
 {question:"How do I ask about a location?",answer:"Share the areas that matter, campaign dates, objective and budget in your brief. OORO reviews the request and confirms what eligible inventory and terms are available before booking."},
 {question:"Is OORO available in every Indian city?",answer:"Bengaluru is the launch focus described on this site. Future city coverage should be treated as a roadmap until OORO confirms operational inventory for a specific campaign."}
]} /></PublicPage>;
}
