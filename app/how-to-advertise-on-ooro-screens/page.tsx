import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "how-to-advertise-on-ooro-screens",
  "How to Advertise on OORO Screens in Bengaluru",
  "See who can enquire, what campaign details to prepare, how OORO reviews creative and confirms eligible screen availability, and how to get started."
);

export default function HowToAdvertiseOnOoroScreensPage() {
  return <ServiceLanding
    eyebrow="OORO / Screen campaigns"
    title="How to advertise on OORO screens"
    intro="OORO is building a digital advertising network inside auto-rickshaws, starting in Bengaluru. A business can submit a campaign request for available passenger-facing screen inventory; OORO reviews the brief and creative, checks eligible availability, and confirms dates and commercial terms before booking."
    image
    sections={[
      {
        title: "Who can enquire",
        body: "Brands, local businesses and advertising agencies can enquire about a campaign. A useful first request names the business, the product or service, the campaign objective, preferred dates, total budget and a contact person. You can mention preferred areas to guide planning; this does not guarantee a specific vehicle, route, neighborhood exposure or audience.",
      },
      {
        title: "The campaign steps",
        body: "1. Share your objective, dates, budget, area preferences and draft creative through [campaign planning](/advertise) or the [campaign brief builder](/tools/campaign-brief-builder).\n\n2. OORO reviews the request and creative requirements, then checks eligible screen inventory for the requested period.\n\n3. Review the proposal, schedule, total commercial terms and reporting details. Ask questions about exclusions before you commit.\n\n4. After you accept confirmed terms and the creative is approved, the team shares the next steps for campaign delivery. An enquiry or planner input alone is not a booking.",
      },
      {
        title: "Prepare a screen-ready message",
        body: "Lead with one offer, location or brand message and one clear next action. Keep essential information legible in a short viewing moment. Ask OORO to confirm current screen dimensions, aspect ratio, file limits, duration and review deadline before producing final artwork; accepted upload file types do not define all screen specifications. See the [creative preparation guide](/guides/dooh-creative-specifications).",
      },
      {
        title: "Confirm what is available and what reporting means",
        body: "Bengaluru is OORO's initial operating focus. Screen inventory, dates, schedule and commercial terms are confirmed for each request. Ask which screens can be included and what the final report records. Device playback information where supported is evidence of playback events; it does not independently establish unique viewers, attention, enquiries or sales. Review [coverage](/coverage) and [measurement methodology](/methodology).",
      },
      {
        title: "Enquire with OORO",
        body: "Send the brief through [OORO's campaign enquiry page](/advertise) or [contact the team](/contact). For pricing context, see [OORO campaign pricing and options](/auto-advertising-cost-bengaluru). The ₹500 minimum input accepted by the budget planner is a tool constraint, not an advertised campaign price, minimum booking or confirmation of inventory.",
      },
    ]}
    faqs={[
      { question: "Can I book a specific route or target a particular person?", answer: "No. Area preferences can inform planning, but OORO does not promise a vehicle route, individual-level targeting or a specific audience." },
      { question: "How much does it cost to advertise on OORO screens?", answer: "There is no public universal rate to quote. Pricing and terms depend on the request and eligible inventory and are confirmed before booking. The budget planner's ₹500 input is not a rate or booking minimum." },
      { question: "What creative file should I send?", answer: "Start with a draft and ask the team to confirm the current screen dimensions, duration and file constraints before final export. Creative is reviewed before a campaign is confirmed." },
    ]}
  />;
}
