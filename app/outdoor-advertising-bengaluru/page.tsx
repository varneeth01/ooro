import type { Metadata } from "next";
import { ServiceLanding } from "@/components/seo/ServiceLanding";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "outdoor-advertising-bengaluru",
  "Outdoor Advertising Options in Bengaluru: Compare Formats",
  "Compare outdoor advertising options in Bengaluru, including fixed billboards and mobile digital screens. Learn what OORO offers and what to confirm before booking."
);

export default function OutdoorAdvertisingPage() {
  return <ServiceLanding
    eyebrow="Bengaluru / Outdoor formats"
    title="Outdoor advertising options in Bengaluru, compared by placement."
    intro="Digital outdoor advertising in Bengaluru can mean fixed venue screens, roadside displays or screens inside vehicles. The placement changes the viewing context, permissions, creative needs and delivery evidence. OORO offers passenger-facing digital screens inside eligible autos and cabs; it does not sell fixed billboards."
    sections={[
      {
        title: "Fixed DOOH and mobile DOOH are different placements",
        body: "Digital out-of-home (DOOH) uses digital screens in physical settings. A screen attached to a fixed venue stays in one location; a screen inside an auto or cab is a mobile placement viewed by passengers. Neither description by itself promises a specific audience or campaign result.\n\nWhen you request a quote, identify the exact screen or vehicle format, dates, schedule, creative duration and who confirms the placement. OORO’s mobile format is described on the [Bengaluru DOOH page](/digital-advertising-bengaluru) and [cab advertising page](/cab-advertising-bengaluru).",
      },
      {
        title: "Compare the full cost, not just a headline rate",
        body: "Ask what the price includes: media time, dates, production, installation if applicable, taxes, cancellation, maintenance and reporting. Confirm whether the rate is for one location, a screen group, a period or another unit. A quote is only comparable when the unit and inclusions match.\n\nFor vehicle screens, confirm eligible inventory and commercial terms for the requested campaign before booking. Area preferences and planning estimates are not a final placement confirmation.",
      },
      {
        title: "Check current rules for the exact format",
        body: "Permissions can depend on whether an advertisement is on a building, street furniture, vehicle exterior or inside a passenger compartment. Ask the operator which approvals apply to the exact location and installation, and check current requirements with the responsible authority. Do not assume rules for exterior vehicle branding apply to an interior screen.\n\nThe [outdoor advertising guide](/guides/outdoor-advertising-bangalore) links to official reference material. For a live campaign, verify applicability with the operator and authority rather than relying on a generic web summary.",
      },
      {
        title: "Agree on how delivery will be reported",
        body: "A media plan, booked schedule, installation photograph, device playback record and audience estimate are different forms of evidence. Ask for the report definition, data source, time period and any exclusions before the campaign begins. Proof-of-Play can record device-reported playback where supported; it is not a count of attentive viewers or sales.\n\nRead [OORO’s measurement methodology](/methodology) and the [OOH versus DOOH comparison](/guides/digital-vs-outdoor-advertising) to keep these measures distinct.",
      },
    ]}
    faqs={[
      { question: "What does digital outdoor advertising mean?", answer: "It generally refers to digital screens used in physical environments outside the home. The exact product could be a fixed screen or a mobile in-vehicle display, so confirm the placement." },
      { question: "Does OORO rent billboards in Bengaluru?", answer: "No. OORO’s listed format is passenger-facing digital screens inside eligible autos and cabs, subject to inventory and terms confirmed per request." },
      { question: "Are auto-screen and billboard audience numbers comparable?", answer: "Only when the source, definition, time period and measurement method match. A device playback record and an estimated audience opportunity are different measures." },
    ]}
  />;
}
