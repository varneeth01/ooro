import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "auto-advertising-cost-bengaluru",
  "OORO Advertising Pricing & Campaign Options in Bengaluru",
  "See OORO's daily auto-screen rates for brands, agencies and Premium slots, minimum campaign terms, longer-commitment discounts and how to request confirmed availability."
);

export default function Page() {
  return <ServiceLanding
    eyebrow="Bengaluru / Pricing and campaign options"
    title="OORO advertising pricing starts with a campaign brief."
    intro="OORO offers passenger-facing digital advertising on eligible auto-rickshaw screens in Bengaluru. Standard, agency and Premium slot rates are listed below in small print. Campaigns have a one-month minimum; longer commitments from three months may qualify for a negotiated discount. OORO confirms inventory and final written terms before booking."
    finePrint="Pricing: Standard brand rate ₹59 per auto per day; agency rate ₹49 per auto per day; Premium slot rate ₹69 per auto per day. Minimum commitment: one month (30 days). Campaigns of 3 months or longer may be eligible for a negotiated discount; discount amount and final terms are confirmed in a written proposal. Rates remain subject to eligible inventory and confirmation."
    sections={[
      {
        title: "What can vary between campaign options",
        body: "A proposal may differ by requested campaign dates, available screen inventory, schedule, total budget, creative review or production needs, and the reporting that can be provided. Ask OORO to state each proposed placement, period, included work, exclusions, cancellation terms and evidence in writing. Three-month and longer commitments may receive a negotiated discount; it is not applied until confirmed in the proposal.",
      },
      {
        title: "Define what the proposal includes",
        body: "Ask the provider to name the placement format, dates, number or type of units included, creative production, taxes, minimum spend, cancellation terms and reporting definitions. Ask which costs are fixed and which depend on eligible inventory. A proposal is easier to compare when every provider prices the same dates, format and deliverables.\n\nFor OORO, the relevant format is a passenger-facing digital screen inside an eligible auto. OORO reviews availability and confirms the commercial terms for each request before booking.",
      },
      {
        title: "Treat the OORO planner as a planning step",
        body: "The self-serve planner accepts budget input from ₹500 and can display a model-based impression estimate. This planner input is separate from the auto-day rates listed above; it is not a quote, booking confirmation or guaranteed delivery.\n\nA campaign request is reviewed against preferred areas, dates, creative and eligible inventory. If the requested plan cannot be confirmed as submitted, clarify the alternatives and revised terms before committing.",
      },
      {
        title: "Set a test budget you can evaluate",
        body: "Start with a total that the business can afford to spend, a clear objective and a defined test period. Decide what evidence would help you evaluate the test before it begins. Keep media cost separate from design, production and taxes so the total cost is clear.\n\nThe [budget planner](/tools/ad-budget-planner) divides your budget evenly by days and makes no reach or impression estimate. See [how auto-rickshaw advertising works](/auto-rickshaw-advertising-bangalore) or [start campaign planning](/advertise).",
      },
    ]}
    faqs={[
      { question: "What is the minimum OORO campaign term?", answer: "The minimum commitment is one month (30 days). Campaigns of three months or longer may qualify for a negotiated discount, confirmed in writing." },
      { question: "What information should I send for a quote?", answer: "Share your objective, preferred areas, dates, total budget, creative format and any production needs. OORO checks eligible inventory and confirms the commercial terms for that specific request." },
      { question: "Does the budget planner forecast impressions?", answer: "No. It only divides a budget across the chosen number of days. It does not estimate inventory, impressions, reach, leads or results." },
    ]}
  />;
}
