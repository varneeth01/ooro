import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CityNetwork } from "@/components/marketing/city-network";
import { PublicPage } from "@/components/marketing/public-page";

export const metadata: Metadata = {
  title: "OORO Coverage | Bengaluru Mobility Advertising",
  description: "Explore OORO's Bengaluru launch network and city expansion roadmap. Screen and neighborhood availability is confirmed for each mobility advertising campaign.",
  alternates: { canonical: "/coverage" },
  openGraph: {
    title: "OORO mobility advertising coverage",
    description: "See OORO's Bengaluru launch market and city expansion roadmap.",
    url: "/coverage",
    type: "website",
    images: [{ url: "/ooro-social-preview.png", width: 1200, height: 630, alt: "OORO advertising that moves" }],
  },
};

export default function CoveragePage() {
  return <PublicPage eyebrow="Coverage / India" title="A city network built one verified screen at a time." description="Bengaluru is OORO's launch market. Explore the network roadmap below, then tell us the neighborhoods and dates that matter to your campaign. Eligible screens are confirmed before booking.">
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
  </PublicPage>;
}
