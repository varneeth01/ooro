import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicPage, PublicCta } from "@/components/marketing/public-page";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "digital-advertising-bengaluru",
  "DOOH Advertising in Bengaluru",
  "Plan digital out-of-home (DOOH) advertising in Bengaluru and Bangalore on passenger-facing auto and cab screens. See how OORO reviews creative, confirms inventory, and reports playback."
);

const questions = [
  {
    question: "What does DOOH mean?",
    answer: "DOOH means digital out-of-home advertising: digital screens used in physical places outside the home. OORO's Bengaluru format is mobile DOOH on passenger-facing screens inside eligible autos and cabs."
  },
  {
    question: "Does OORO offer digital billboards?",
    answer: "No. This OORO service is passenger-facing digital screens inside eligible autos and cabs. It is not fixed billboard inventory or an online search or social campaign."
  },
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
  const crumbs = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Bengaluru advertising", path: "/bengaluru" }, { name: "DOOH advertising in Bengaluru", path: "/digital-advertising-bengaluru" }]);
  return <PublicPage
    eyebrow="Bengaluru / Digital out-of-home"
    title="DOOH advertising in Bengaluru, on the move."
    description="OORO offers mobile digital out-of-home (DOOH) advertising on passenger-facing screens inside eligible autos and cabs in Bengaluru. Inventory, dates and commercial terms are checked for each request."
  >
    <article className="container-ooro max-w-5xl py-14 sm:py-20 text-[#182019]">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600"><Link href="/">Home</Link><span className="px-2">/</span><Link href="/bengaluru">Bengaluru advertising</Link><span className="px-2">/</span><span aria-current="page">DOOH advertising</span></nav>

      <figure className="mt-8">
        <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-neutral-200">
          <Image
            src="/field/ooro-bengaluru-auto-02.webp"
            alt="OORO passenger-facing digital display installed inside an auto-rickshaw in Bengaluru"
            fill
            sizes="(max-width: 768px) calc(100vw - 40px), 960px"
            className="object-cover"
          />
        </div>
        <figcaption className="mt-3 text-sm leading-6 text-neutral-600">OORO field photography. Campaign availability is checked separately for each request.</figcaption>
      </figure>

      <section className="mt-10 border-y border-black/15 bg-white px-5 py-6 sm:px-8" aria-label="Direct answer about OORO DOOH">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#596944]">Direct answer</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">What is DOOH advertising in Bengaluru?</h2>
        <p className="mt-4 max-w-4xl text-base leading-8 text-neutral-700">Digital out-of-home (DOOH) is advertising shown on digital screens in physical environments. OORO&apos;s Bengaluru format is mobile DOOH: a passenger-facing screen inside an eligible auto or cab. OORO confirms inventory and terms before booking; the service does not guarantee a particular route or audience.</p>
      </section>

      <section className="mt-10 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Digital outdoor advertising in Bangalore: fixed or mobile?</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">People use “digital outdoor advertising in Bangalore” for different placements, from fixed venue screens to displays in moving vehicles. OORO is the mobile format: a passenger-facing screen inside an eligible auto or cab. Bengaluru and Bangalore are commonly used names for the same city; neither name implies that a particular neighborhood or route is guaranteed.</p>
      </section>

      <section className="mt-12 grid gap-4 border-y border-black/15 py-7 sm:grid-cols-3" aria-label="OORO format at a glance">
        <div><h2 className="font-semibold">The placement</h2><p className="mt-2 text-sm leading-6 text-neutral-700">A digital message on a passenger-facing screen inside an eligible auto or cab.</p></div>
        <div><h2 className="font-semibold">What gets confirmed</h2><p className="mt-2 text-sm leading-6 text-neutral-700">Eligible screens, dates and commercial terms are reviewed before booking.</p></div>
        <div><h2 className="font-semibold">What playback means</h2><p className="mt-2 text-sm leading-6 text-neutral-700">A playback record, where supported, does not establish unique viewers or sales.</p></div>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Which type of digital advertising fits your business?</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">The term “digital ads in Bengaluru” can mean an online campaign or a physical digital display. Before comparing quotes, start with the customer&apos;s context: are they actively searching for a service, scrolling through a feed, or traveling through the city?</p>
        <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[580px] border-collapse text-left text-sm"><caption className="sr-only">Bengaluru advertising channel comparison</caption><thead><tr className="border-b border-black/20"><th scope="col" className="p-3">Format</th><th scope="col" className="p-3">Useful when</th><th scope="col" className="p-3">Evidence to request</th></tr></thead><tbody className="text-neutral-700">
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Search advertising</th><td className="p-3">People are looking for your product or service now</td><td className="p-3">Clicks, queries, conversions and spend</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Social media advertising</th><td className="p-3">You want to communicate an offer or build awareness in a feed</td><td className="p-3">Delivery metrics, clicks and measured outcomes</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">Fixed outdoor screens</th><td className="p-3">A fixed site or known viewing context suits the message</td><td className="p-3">Placement, schedule and playback records</td></tr>
          <tr className="border-b border-black/10"><th scope="row" className="p-3 font-semibold">OORO mobile DOOH</th><td className="p-3">You want a brand message inside a passenger&apos;s auto or cab journey</td><td className="p-3">Approved inventory and proof-of-play where supported</td></tr>
        </tbody></table></div>
        <p className="mt-4 text-sm leading-6 text-neutral-600">OORO offers mobile DOOH inside eligible autos and cabs. This comparison is educational; OORO does not sell Google Ads, Meta Ads or fixed billboards.</p>
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
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">A useful proposal separates media delivery from creative production, taxes, campaign dates and any optional services. OORO&apos;s planning tool starts at a ₹500 input budget, but a planning estimate is not confirmed availability or a final quote. For a first test, decide what you want the passenger to remember and how you will measure the result outside the screen.</p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium">
          <Link href="/auto-advertising-cost-bengaluru" className="underline underline-offset-4">Understand auto advertising costs</Link>
          <Link href="/tools/ad-budget-planner" className="underline underline-offset-4">Use the budget planner</Link>
          <Link href="/methodology" className="underline underline-offset-4">Read measurement methodology</Link>
        </div>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">What to confirm before you book</h2>
        <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">Use these questions to compare an OORO proposal with any other advertising quote. Get the answers in writing so a preference, estimate or sample report is not mistaken for a confirmed placement.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            "Which screens and campaign dates are confirmed for this request?",
            "What is included in the price, and what costs extra?",
            "What file dimensions, duration and review deadline apply to this screen?",
            "Which delivery records will the report show, and which figures are estimates?",
            "What happens if inventory, artwork or dates need to change?",
            "Who will approve the final creative and confirm the campaign is booked?",
          ].map(question => <li key={question} className="border border-black/15 p-4 text-sm leading-6 text-neutral-700">{question}</li>)}
        </ul>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-neutral-600">For a related format guide, read <Link className="underline underline-offset-4" href="/auto-rickshaw-advertising-bangalore">how advertising inside auto-rickshaws works</Link>. For OORO&apos;s reporting limits, see the <Link className="underline underline-offset-4" href="/methodology">measurement methodology</Link>.</p>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-5 space-y-5">{questions.map(item => <div key={item.question} className="border-b border-black/10 pb-5"><h3 className="font-semibold">{item.question}</h3><p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-700">{item.answer}</p></div>)}</div>
      </section>

      <section className="mt-12 border-t border-black/15 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Planning a Bengaluru campaign?</h2>
        <p className="mt-4 max-w-3xl leading-8 text-neutral-700">Tell us your business, audience, preferred areas, dates and budget. OORO will review the request and confirm eligible inventory and the applicable terms before any campaign is booked.</p>
        <div className="mt-7"><PublicCta href="/advertise">Plan DOOH advertising in Bengaluru</PublicCta></div>
        <p className="mt-5 text-sm text-neutral-700">You can also explore <Link className="underline underline-offset-4" href="/auto-rickshaw-advertising-bangalore">advertising inside auto-rickshaws</Link>, <Link className="underline underline-offset-4" href="/cab-advertising-bengaluru">cab advertising in Bengaluru</Link>, or <Link className="underline underline-offset-4" href="/contact">contact the OORO team</Link>.</p>
      </section>
    </article>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
  </PublicPage>;
}
