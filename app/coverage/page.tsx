import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, PublicSection, PublicCta } from "@/components/marketing/public-page";
import { CityNetwork } from "@/components/marketing/city-network";

export const metadata: Metadata = {
  title: "Bengaluru Coverage | Auto & Cab Screen Advertising",
  description: "Explore OORO's Bengaluru-first launch market, choose a neighborhood to target and request a mobility advertising campaign. Live screen inventory is confirmed before booking.",
  alternates: { canonical: "/coverage" },
  openGraph: { title: "OORO Bengaluru Mobility Advertising Coverage", description: "Find out where OORO is launching, see planned city expansion and request advertising on in-auto and cab screens in Bengaluru.", url: "/coverage", type: "website" },
};
export default function CoveragePage() {
  return <PublicPage eyebrow="Network coverage" title="Bengaluru first. Advertising that moves." description="We're building OORO's first in-vehicle advertising network in Bengaluru. Select a target area and send us your campaign brief; we confirm available screens and delivery before any booking.">
    <PublicSection title="Plan for Bengaluru"><p>Choose preferred neighborhoods such as BTM Layout, Koramangala, Indiranagar or Marathahalli, plus your budget and dates. Areas are planning preferences, not a guarantee that specific vehicles or screens are currently available.</p><div className="mt-7 flex flex-wrap gap-3"><PublicCta href="/advertise">Plan a Bengaluru campaign</PublicCta><Link href="/bengaluru" className="inline-flex items-center rounded-lg border border-neutral-300 px-5 py-3.5 text-sm font-medium">Explore Bengaluru advertising</Link></div></PublicSection>
    <div className="container-ooro pb-16 sm:pb-24"><div className="mb-7"><h2 className="display text-3xl font-medium sm:text-5xl">Our city rollout</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">Bengaluru is our launch focus. Other cities are listed for future interest only. Markers describe a launch market, not live or sold screen counts.</p></div><CityNetwork/></div>
  </PublicPage>;
}
