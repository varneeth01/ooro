import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "auto-advertising-cost-bengaluru",
  "DOOH Advertising Cost in Bengaluru: Auto Screens",
  "Understand the factors that shape a passenger-screen advertising proposal in Bengaluru. OORO confirms eligible inventory and terms before booking; estimates are not guaranteed rates or delivery."
);

export default function Page() {
  return <ServiceLanding
    eyebrow="Bengaluru / Cost and planning"
    title="A useful price starts with a defined campaign."
    intro="There is no responsible universal rate to quote without a format, dates, creative requirements and eligible inventory. This page explains how to request a comparable proposal for passenger-facing digital screens in autos and cabs."
    sections={[
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
