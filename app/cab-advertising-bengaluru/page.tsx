import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "cab-advertising-bengaluru",
  "Cab Advertising in Bengaluru",
  "Explore passenger-facing cab advertising in Bengaluru. OORO reviews creative, eligible screen inventory and commercial terms before confirming a campaign."
);

export default function CabAdvertisingPage() {
  return <ServiceLanding
    eyebrow="Bengaluru / Cab advertising"
    title="Cab advertising for the passenger journey."
    intro="Cab advertising can mean in-app placements, exterior branding or a screen inside the vehicle. OORO’s format is passenger-facing digital media on eligible in-vehicle screens, with availability and terms confirmed per request."
    sections={[
      {
        title: "Know which cab advertising format a proposal includes",
        body: "A rider app promotion, a printed vehicle wrap and an interior digital display are different placements. Before comparing offers, confirm where the message appears, who sees it, how long it runs and who operates the media. OORO does not sell ride-hailing app ads or exterior cab wraps.\n\nOORO focuses on digital screens inside eligible autos and cabs in Bengaluru. A cab-screen request is reviewed against eligible inventory; this page does not claim that every vehicle or city route carries an OORO screen.",
      },
      {
        title: "Plan around the customer context",
        body: "Describe the customer, the message and the action you want them to take. A short in-vehicle message may suit a simple brand idea, launch or offer better than a detailed explanation. Send the reader to a mobile-friendly page when the offer needs more information.\n\nPreferred areas and dates can help OORO review a request. They are planning inputs, not a guarantee of a particular cab, route, passenger profile or screen availability.",
      },
      {
        title: "Confirm creative and availability before booking",
        body: "Prepare the campaign objective, dates, preferred Bengaluru areas, budget and draft creative. Ask the OORO team to confirm the screen format, file requirements, eligible inventory, schedule and commercial terms in writing before you commit. The creative review and availability check are part of the request process.\n\nSee [how OORO plans campaigns](/how-it-works), review [DOOH advertising in Bengaluru](/digital-advertising-bengaluru), or [start a campaign request](/advertise).",
      },
      {
        title: "Understand what the report can establish",
        body: "Where supported, Proof-of-Play records can show device-reported playback for approved creative. A playback record is not a count of unique cab passengers, proof that someone noticed the message, or a guarantee of visits and sales. Ask which data fields and exceptions apply to the specific campaign.\n\nRead [OORO’s measurement methodology](/methodology) and the guide to [Proof-of-Play in DOOH](/guides/proof-of-play-dooh) before comparing a screen report with other media metrics.",
      },
      {
        title: "Compare a cab-screen proposal fairly",
        body: "Compare total cost for the same dates and scope. Check production or tax exclusions, cancellation terms, the screens included, how availability is confirmed and what evidence is delivered. Do not compare a projected audience opportunity from one plan with a device playback record from another as though they measure the same thing.\n\nFor broader local planning, see [advertising in Bengaluru](/bengaluru), [auto-rickshaw advertising](/auto-rickshaw-advertising-bangalore), and [the OOH versus DOOH guide](/guides/digital-vs-outdoor-advertising).",
      },
    ]}
    faqs={[
      { question: "Does OORO sell ads inside cab-hailing apps?", answer: "No. OORO’s described service is passenger-facing digital advertising on screens inside eligible autos and cabs, not in-app advertising or ride-hailing search placements." },
      { question: "Can I select a Bengaluru cab route?", answer: "You can share preferred areas and dates for planning. OORO does not guarantee a specific vehicle, route, individual audience or screen availability." },
      { question: "Does cab-screen advertising guarantee bookings or sales?", answer: "No. OORO reviews inventory and terms before booking. Playback records, where supported, do not prove passenger attention, visits or sales." },
    ]}
  />;
}
