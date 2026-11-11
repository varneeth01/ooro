import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, PublicSection, PublicCta } from "@/components/marketing/public-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("bengaluru", "Advertising in Bengaluru for Local Businesses", "Explore OORO's passenger-facing digital advertising inside autos and cabs in Bengaluru. Campaign availability and commercial terms are confirmed before booking.");
export default function BengaluruPage() {
 return <PublicPage eyebrow="Bengaluru / Mobility advertising" title="Reach customers on the move in Bengaluru." description="OORO helps businesses and brands request advertising placements on digital screens inside autos and cabs. Our Bengaluru network is the initial launch focus, and live screen availability is confirmed for every campaign.">
 <PublicSection title="Advertising that moves through the city">
 <p>Plan a campaign around areas such as BTM Layout, Koramangala, Indiranagar or Marathahalli. Tell OORO the audience, schedule and budget you have in mind, and our team will confirm eligible vehicles and screens before booking. Neighborhood examples are targeting preferences, not a guarantee of coverage.</p>
 </PublicSection>
 <PublicSection title="From request to verified delivery">
 <ol className="list-decimal space-y-3 pl-6"><li>Submit a campaign brief with your target Bengaluru areas, dates and budget.</li><li>Share image or video artwork for review.</li><li>OORO checks available screens, confirms commercial terms and schedules approved media.</li><li>Review playback reporting and QR engagement where supported. A campaign assignment alone is not proof of play.</li></ol>
 <div className="mt-8"><PublicCta href="/advertise">Plan Bengaluru advertising</PublicCta></div>
 <p className="mt-6 text-sm">For campaign questions, visit <Link className="underline underline-offset-4" href="/about">our team page</Link>.</p>
 </PublicSection>
 <PublicSection title="Explore advertising formats and planning">
  <ul className="grid gap-3 sm:grid-cols-2">{[["Digital out-of-home advertising", "/digital-advertising-bengaluru"], ["Auto-rickshaw advertising", "/auto-rickshaw-advertising-bangalore"], ["Outdoor advertising options", "/outdoor-advertising-bengaluru"], ["Advertising for small businesses", "/small-business-advertising-bangalore"], ["Auto advertising costs and planning", "/auto-advertising-cost-bengaluru"], ["Advertising guides", "/guides"]].map(([label, href]) => <li key={href}><Link href={href} className="flex min-h-14 items-center justify-between border-b border-black/15 py-3 font-medium underline-offset-4 hover:underline">{label}<span aria-hidden="true">↗</span></Link></li>)}</ul>
 </PublicSection>
 </PublicPage>;
}
