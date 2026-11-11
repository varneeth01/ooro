import type { Metadata } from "next";
import { PublicPage, PublicSection } from "@/components/marketing/public-page";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("how-it-works", "How OORO Campaign Planning Works", "Understand campaign briefs, creative review, eligible inventory confirmation and scheduling with OORO.");

const steps = [
  { number: "01", title: "Set the brief", copy: "Choose a city, areas, dates and budget. These are planning inputs; OORO checks eligible screen inventory before confirming availability." },
  { number: "02", title: "Review the creative", copy: "Submit image or video artwork for review. Only approved creative can move into the scheduling workflow." },
  { number: "03", title: "Schedule eligible screens", copy: "The operations team confirms commercial terms and schedules approved media against eligible screens and campaign dates." },
  { number: "04", title: "Read delivery evidence", copy: "Where supported, device-reported playback events provide evidence of delivery. Forecasts and schedules remain separate from verified plays." },
] as const;

export default function HowItWorksPage() {
  return <PublicPage eyebrow="How OORO works" title="From campaign brief to delivery evidence." description="A clear operating path for mobility advertising: request a plan, review creative, confirm eligible inventory and understand what actually played.">
    <PublicSection title="Four steps. Clear checkpoints.">
      <ol className="mt-10 border-t border-black/15">
        {steps.map(step => <li key={step.number} className="grid gap-4 border-b border-black/15 py-7 sm:grid-cols-[72px_minmax(0,1fr)_minmax(180px,.65fr)] sm:items-start sm:gap-8 sm:py-9">
          <span className="font-mono text-sm tabular-nums text-[#687100]">{step.number}</span>
          <h2 className="text-xl font-semibold tracking-tight text-[#101210] sm:text-2xl">{step.title}</h2>
          <p className="max-w-xl text-sm leading-7 text-neutral-600">{step.copy}</p>
        </li>)}
      </ol>
    </PublicSection>
  </PublicPage>;
}
