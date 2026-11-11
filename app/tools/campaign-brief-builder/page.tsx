import type { Metadata } from "next";
import Link from "next/link";
import { CampaignBriefBuilder } from "@/components/seo/CampaignBriefBuilder";
import { PublicPage, PublicSection } from "@/components/marketing/public-page";
import { ContentFaq } from "@/components/marketing/content-faq";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "tools/campaign-brief-builder",
  "Free DOOH Campaign Brief Builder for Bengaluru",
  "Create a practical digital out-of-home campaign brief for Bengaluru. Organize objectives, preferred areas, dates, creative, budget and reporting questions."
);

export default function CampaignBriefBuilderPage() {
  return <PublicPage eyebrow="Free campaign planning tool" title="Build a clearer DOOH campaign brief." description="Turn your campaign objective, preferred Bengaluru areas, schedule, creative and reporting needs into a brief you can copy and share.">
    <CampaignBriefBuilder />
    <PublicSection title="Use the brief to request a proposal">
      <p>A completed brief helps a media partner assess your request. OORO confirms eligible screens, creative approval, campaign dates and commercial terms before booking. Preferred areas do not guarantee a particular vehicle, route or delivery volume.</p>
      <p className="mt-5">Need help deciding what to include? Read the <Link className="underline decoration-[#829d00] underline-offset-4" href="/guides/dooh-campaign-brief-bengaluru">DOOH campaign brief guide</Link>, review <Link className="underline decoration-[#829d00] underline-offset-4" href="/methodology">OORO&apos;s campaign planning methodology</Link>, or <Link className="underline decoration-[#829d00] underline-offset-4" href="/advertise">request campaign planning</Link>.</p>
    </PublicSection>
    <ContentFaq title="Campaign brief builder questions" items={[
      { question: "Is this tool free and does it send my information?", answer: "Yes, it is free. The brief is generated in your browser and is not submitted to OORO or stored by this tool." },
      { question: "Does the brief builder check screen availability or campaign pricing?", answer: "No. It organizes your request but does not check live inventory, calculate reach, quote prices or book a campaign. OORO confirms availability and terms separately." },
      { question: "What if I do not know the technical creative specifications?", answer: "Leave that field open and ask the media provider for current specifications before producing final artwork." }
    ]} />
  </PublicPage>;
}
