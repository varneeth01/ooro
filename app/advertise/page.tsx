import type { Metadata } from "next";
import { SelfServeForecastBuilder } from "@/components/marketing/self-serve-forecast-builder";
import { PublicCta, PublicPage, PublicSection } from "@/components/marketing/public-page";
import { pageMetadata } from "@/lib/seo";
import { ContentFaq } from "@/components/marketing/content-faq";
export const metadata: Metadata = pageMetadata("advertise", "Plan a Campaign with OORO", "Request a campaign on eligible digital screens inside autos and cabs. OORO reviews creative, inventory and commercial terms before confirmation.");
export default function AdvertisePage() { return <PublicPage eyebrow="Self-serve advertising" title="Advertise where your customers move." description="Choose an area, set your budget, and see estimated campaign delivery across OORO's connected mobility network."><div className="container-ooro py-12 sm:py-20"><SelfServeForecastBuilder/></div><PublicSection title="Simple buying for local businesses"><p>Start from ₹500. OORO estimates delivery from your selected location, radius, dates, budget and available inventory. Verified Proof-of-Play confirms what screens actually played.</p><div className="mt-8"><PublicCta href="/signup">Launch campaign</PublicCta></div></PublicSection><ContentFaq title="Campaign planning questions" items={[
 {question:"What can I request through OORO?",answer:"You can request advertising on eligible passenger-facing digital screens inside autos and cabs. OORO does not sell Google Search ads, social media placements or billboard inventory."},
 {question:"Does the estimate confirm a booking?",answer:"No. A planning estimate is an input for discussion. OORO checks eligible screen inventory, creative approval and commercial terms before confirming a campaign."},
 {question:"What should I prepare before starting?",answer:"Have a campaign objective, preferred Bengaluru areas, dates, budget and draft image or video creative ready. Area preferences help planning but do not guarantee a particular route or vehicle."}
]} /></PublicPage>; }
