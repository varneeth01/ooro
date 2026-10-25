import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, PublicSection, PublicCta } from "@/components/marketing/public-page";

export const metadata: Metadata = {
 title: "Auto & Cab Screen Advertising in Bengaluru",
 description: "Explore OORO mobility advertising for Bengaluru businesses, agencies and brands. Plan campaigns for in-auto and cab screens, with local targeting and verified playback where available.",
 alternates: { canonical: "/bengaluru" },
 openGraph: { title: "In-auto & Cab Advertising in Bengaluru | OORO", description: "Bring your brand into everyday commutes across Bengaluru with OORO's mobility screen advertising network.", url: "/bengaluru", type: "website" },
};
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
 </PublicPage>;
}
