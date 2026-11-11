import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "auto-advertising-cost-bengaluru",
  "OORO Advertising Pricing & Campaign Options in Bengaluru",
  "Understand how OORO campaign proposals are prepared, what the ₹500 planner input means, what details affect pricing and how to request confirmed availability."
);

export default function Page() {
  return <ServiceLanding
    eyebrow="Bengaluru / Pricing and campaign options"
    title="OORO advertising pricing starts with a campaign brief."
    intro="OORO campaign pricing depends on the requested format, dates, creative requirements and eligible inventory. There is no public rate card to treat as a confirmed quote. Businesses can request passenger-facing screen inventory inside eligible autos; OORO confirms availability and commercial terms before booking."
    sections={[
      {
        title: "What can vary between campaign options",
        body: "A proposal may differ by requested campaign dates, available screen inventory, schedule, total budget, creative review or production needs, and the reporting that can be provided. Ask OORO to state each proposed placement, period, included work, exclusions, cancellation terms and evidence in writing. There are no publicly listed fixed packages on this page; the available option is scoped and confirmed for each request.",
      },
      {
        title: "Define what the proposal includes",
        body: "Ask the provider to name the placement format, dates, number or type of units included, creative production, taxes, minimum spend, cancellation terms and reporting definitions. Ask which costs are fixed and which depend on eligible inventory. A proposal is easier to compare when every provider prices the same dates, format and deliverables.\n\nFor OORO, the relevant format is a passenger-facing digital screen inside an eligible auto or cab. OORO reviews availability and confirms the commercial terms for each request before booking.",
      },
      {
        title: "Treat the OORO planner as a planning step",
        body: "The self-serve planning flow accepts a budget input from ₹500. That is a tool minimum, not an advertising rate, available-inventory promise or guaranteed campaign outcome. The planner can help frame a request; it does not create a confirmed quote.\n\nA campaign request is reviewed against preferred areas, dates, creative and eligible inventory. If the requested plan cannot be confirmed as submitted, clarify the alternatives and revised terms before committing.",
      },
      {
        title: "Set a test budget you can evaluate",
        body: "Start with a total that the business can afford to spend, a clear objective and a defined test period. Decide what evidence would help you evaluate the test before it begins. Keep media cost separate from design, production and taxes so the total cost is clear.\n\nThe [budget planner](/tools/ad-budget-planner) divides your budget evenly by days and makes no reach or impression estimate. See [how auto-rickshaw advertising works](/auto-rickshaw-advertising-bangalore) or [start campaign planning](/advertise).",
      },
    ]}
    faqs={[
      { question: "Is ₹500 the price of an OORO campaign?", answer: "No. It is the minimum budget input accepted by the planning flow. It is not a booking minimum, media rate or confirmation that inventory is available." },
      { question: "What information should I send for a quote?", answer: "Share your objective, preferred areas, dates, total budget, creative format and any production needs. OORO checks eligible inventory and confirms the commercial terms for that specific request." },
      { question: "Does the budget planner forecast impressions?", answer: "No. It only divides a budget across the chosen number of days. It does not estimate inventory, impressions, reach, leads or results." },
    ]}
  />;
}
