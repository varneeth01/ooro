import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "small-business-advertising-bangalore",
  "Advertising for Small Businesses in Bangalore",
  "A practical starting point for Bengaluru businesses comparing local advertising channels and planning a campaign budget."
);

export default function Page() {
  return <ServiceLanding
    eyebrow="Bengaluru / Local business"
    title="Make a local campaign fit the business you actually run."
    intro="A restaurant, salon, clinic, gym, retailer or coaching business each has a different service area, schedule and customer decision. Start with those realities before choosing a channel."
    sections={[
      {
        title: "Write a one-page brief",
        body: "State who you serve, what you want them to do, when the message matters, how much you can spend and what evidence would help you learn. Keep the first test narrow enough to evaluate honestly.\n\nFor example, a business introducing a new location needs a different message and timeframe from one promoting a limited-period offer. Name one audience context and one action so the creative can stay clear.",
      },
      {
        title: "Choose a channel by customer context",
        body: "Local search can help when people are actively looking. Social media can introduce an offer while people browse. Partnerships and community activity can build relationships. Out-of-home advertising places a message in a physical setting. Compare the context, cost, lead time and measurement method rather than choosing a channel by name alone.\n\nOORO focuses on digital displays inside participating autos and cabs. It does not sell search ads, social campaigns or billboard placements. Eligible inventory and commercial terms are confirmed per campaign request.",
      },
      {
        title: "Budget for the full effort",
        body: "Clarify media, creative, tax and production costs with each provider. Ask for the dates and placements covered, what can change, how cancellations work and what reporting is included. Do not assume a forecast is a guarantee of audience or sales.\n\nOur [budget planner](/tools/ad-budget-planner) performs simple daily allocation only. Read [how to advertise in Bengaluru](/guides/advertise-business-bengaluru), compare [outdoor formats](/outdoor-advertising-bengaluru), then [review OORO campaign planning](/advertise).",
      },
    ]}
    faqs={[
      { question: "What kinds of advertising does OORO offer?", answer: "OORO offers passenger-facing digital advertising on screens inside eligible autos and cabs. It does not provide search ads, social media campaigns or outdoor billboard inventory." },
      { question: "Can I target a specific Bengaluru neighborhood?", answer: "You can share preferred areas to guide planning. A preference is not a guarantee of a particular route, vehicle, date or audience; OORO confirms eligible inventory before booking." },
      { question: "How should a small business compare proposals?", answer: "Compare the format, dates, total cost, production or tax exclusions, availability, cancellation terms and delivery evidence. Check that any forecast is clearly labelled as an estimate." },
    ]}
  />;
}
