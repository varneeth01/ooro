import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage, PublicCta } from "@/components/marketing/public-page";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "digital-advertising-bengaluru",
  "Digital Advertising in Bengaluru: Auto Screens and Local Campaigns",
  "Looking for digital advertising in Bengaluru? Compare Google and social ads with OORO's passenger-facing digital screens inside autos. Learn about creative, costs, booking and proof of play."
);

const questions = [
  {
    question: "Does OORO run Google Ads or social media campaigns?",
    answer: "Not through this service. OORO's current offering is digital out-of-home advertising on eligible passenger-facing screens inside participating vehicles. Search and social ads are different channels."
  },
  {
    question: "Can I guarantee a particular route or neighborhood?",
    answer: "No. You can share preferred areas in Bengaluru, but they are planning preferences, not a guarantee that an auto follows a particular route or that inventory is available at a certain time."
  },
  {
    question: "How much does digital advertising inside an auto cost?",
    answer: "Costs depend on the campaign scope, dates, eligible inventory and creative needs. The OORO planning tool accepts budgets starting at ₹500; that input minimum is not a guaranteed media rate or booking."
  },
  {
    question: "What does proof of play tell me?",
    answer: "Where supported, proof-of-play records help establish that approved creative was played by a screen. They do not, by themselves, prove unique passengers, attention, visits or purchases."
  },
];

export default function Page() {
  const crumbs = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Bengaluru advertising", path: "/bengaluru" }, { name: "Digital advertising in Bengaluru", path: "/digital-advertising-bengaluru" }]);
  return <PublicPage
    eyebrow="Bengaluru / Advertising options"
    title="Digital advertising in Bengaluru, beyond the phone."
    description="Searching for advertising in Bengaluru? Search, social, billboards and passenger-facing digital screens solve different problems. OORO focuses on advertising inside eligible autos—helping local businesses plan a campaign without inventing coverage or results."
  >
    <article className="container-ooro max-w-5xl py-14 sm:py-20 text-[#182019]">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600"><Link href="/">Home</Link><span className="px-2">/</span><Link href="/bengaluru">Bengaluru advertising</Link><span className="px-2">/</span><span aria-current="page">Digital advertising</span></nav>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Which type of digital advertising fits your business?</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">The term “digital ads in Bengaluru” can mean an online campaign or a physical digital display. Before comparing quotes, start with the customer's context: are they actively searching for a service, scrolling through a feed, or traveling through the city?</p>
        <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[580px] border-collapse text-left text-sm"><caption className="sr-only">Bengaluru advertising channel comparison</caption><thead><tr className="border-b border-black/20"><th scope="col" className="p-3">Format</th><th scope="col" className="p-3">Useful when</th><th scope="col" className="p-3">Evidence to request</th></tr></thead><tbody className="text-neutral-700">
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Search advertising</th><td className="p-3">People are looking for your product or service now</td><td className="p-3">Clicks, queries, conversions and spend</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Social media advertising</th><td className="p-3">You want to communicate an offer or build awareness in a feed</td><td className="p-3">Delivery metrics, clicks and measured outcomes</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Fixed outdoor screens</th><td className="p-3">A fixed site or known viewing context suits the message</td><td className="p-3">Placement, schedule and playback records</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">OORO auto screens</th><td className="p-3">You want a brand message inside a passenger's everyday journey</td><td className="p-3">Approved inventory and proof-of-play where supported</td></tr>
        </tbody></table></div>
        <p className="mt-4 text-sm leading-6 text-neutral-600">OORO offers the last format. This comparison is educational, not an offer to buy Google Ads, Meta Ads or fixed billboards through OORO.</p>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How an OORO campaign in Bengaluru is planned</h2>
        <ol className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            ["01", "Define the customer and message", "A clear offer or brand idea works better than trying to fit an entire brochure on a passenger-facing screen."],
            ["02", "Share preferred areas and dates", "Tell us which parts of Bengaluru matter to your business. Koramangala, BTM Layout, Indiranagar and Marathahalli are examples of requested areas, not confirmed coverage."],
            ["03", "Confirm the creative and inventory", "Submit an image or video for review. OORO confirms eligible screens, timing and commercial terms before booking."],
            ["04", "Read the delivery report carefully", "Ask which records represent actual screen playback and which numbers are estimates. QR activity, if provided, is not the same as sales."]
          ].map(([number, heading, body]) => <li key={number} className="border border-black/15 p-5"><span className="text-sm font-bold text-[#526600]">{number}</span><h3 className="mt-3 font-semibold">{heading}</h3><p className="mt-3 text-sm leading-7 text-neutral-700">{body}</p></li>)}
        </ol>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Budget, creative and measurement</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">A useful proposal separates media delivery from creative production, taxes, campaign dates and any optional services. OORO's planning tool starts at a ₹500 input budget, but a planning estimate is not confirmed availability or a final quote. For a first test, decide what you want the passenger to remember and how you will measure the result outside the screen.</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/auto-advertising-cost-bengaluru" className="underline underline-offset-4">Understand auto advertising costs</Link>
          <Link href="/tools/ad-budget-planner" className="underline underline-offset-4">Use the budget planner</Link>
          <Link href="/methodology" className="underline underline-offset-4">Read measurement methodology</Link>
        </div>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-5 space-y-5">{questions.map(item => <div key={item.question} className="border-b border-black/10 pb-5"><h3 className="font-semibold">{item.question}</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-700">{item.answer}</p></div>)}</div>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planning a Bengaluru campaign?</h2>
        <p className="mt-4 max-w-3xl leading-8 text-neutral-700">Tell us your business, audience, preferred areas, dates and budget. OORO will review the request and confirm eligible inventory and the applicable terms before any campaign is booked.</p>
        <div className="mt-7"><PublicCta href="/advertise">Plan advertising in Bengaluru</PublicCta></div>
        <p className="mt-5 text-sm text-neutral-700">You can also explore <Link className="underline underline-offset-4" href="/auto-rickshaw-advertising-bangalore">advertising inside auto-rickshaws</Link> or <Link className="underline underline-offset-4" href="/contact">contact the OORO team</Link>.</p>
      </section>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
  </PublicPage>;
}
