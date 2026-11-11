import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/marketing/public-page";
import { guides } from "@/content/guides";
import { pageMetadata } from "@/lib/seo";
import { ContentFaq } from "@/components/marketing/content-faq";

export const metadata: Metadata = pageMetadata("guides", "Advertising Guides for Bengaluru Businesses", "Practical, clearly sourced guidance on local advertising, campaign planning, digital out-of-home and creative preparation.");
export default function GuidesPage() {
  const published = guides.filter(g => !g.outline);
  const groups = [
    { title: "Choose a format", slugs: ["digital-vs-outdoor-advertising", "auto-rickshaw-advertising", "auto-advertising-vs-billboards", "mobile-dooh-vs-digital-billboards", "what-is-dooh-advertising-bengaluru", "dooh-vs-social-ads-bengaluru", "how-outdoor-advertising-works-bengaluru"] },
    { title: "Plan a campaign", slugs: ["advertise-business-bengaluru", "dooh-campaign-brief-bengaluru", "set-local-advertising-budget", "dooh-creative-specifications", "dooh-ad-creative-best-practices", "programmatic-dooh-explained"] },
    { title: "Plan for your business", slugs: ["small-business-marketing-ideas-bengaluru", "restaurant-local-advertising", "dooh-for-startups-bengaluru", "dooh-for-real-estate-bengaluru", "dooh-for-retail-and-fmcg-bengaluru", "hyperlocal-dooh-strategy-bengaluru"] },
    { title: "Measure responsibly", slugs: ["proof-of-play-dooh", "dooh-campaign-roi-measurement", "dooh-audience-targeting-and-privacy"] },
  ];
  const assigned = new Set<string>();
  return <PublicPage eyebrow="OORO / Field notes" title="Advertising guides for Bengaluru businesses." description="Compare local advertising formats, plan a campaign budget, prepare creative and understand delivery evidence. Each guide separates useful planning advice from what a media provider can actually confirm." size="compact" primaryAction={{ href: "/digital-advertising-bengaluru", label: "Explore OORO in Bengaluru" }} secondaryAction={{ href: "/tools/campaign-brief-builder", label: "Build a campaign brief" }}>
    <section className="container-ooro py-14 sm:py-20"><p className="text-sm leading-7 text-neutral-600">Browse {published.length} practical guides by the decision you are trying to make. Start with a format comparison, plan your first request, or check how media delivery should be measured.</p>
      {groups.map(group => {
        const items = group.slugs.map(slug => published.find(guide => guide.slug === slug)).filter((guide): guide is (typeof published)[number] => Boolean(guide));
        items.forEach(guide => assigned.add(guide.slug));
        return <section key={group.title} className="mt-14 border-t border-black/15 pt-7"><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{group.title}</h2><ul className="mt-3 divide-y divide-black/10">{items.map(guide => <li key={guide.slug}><Link href={`/guides/${guide.slug}`} className="group grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><span><span className="block text-lg font-semibold tracking-tight group-hover:underline">{guide.title}</span><span className="mt-1.5 block max-w-3xl text-sm leading-6 text-neutral-600">{guide.description}</span></span><span aria-hidden="true" className="text-lg transition-transform group-hover:translate-x-1">↗</span></Link></li>)}</ul></section>;
      })}
      {published.some(guide => !assigned.has(guide.slug)) && <section className="mt-14 border-t border-black/15 pt-7"><h2 className="text-2xl font-semibold tracking-tight">More advertising guides</h2><ul className="mt-3 divide-y divide-black/10">{published.filter(guide => !assigned.has(guide.slug)).map(guide => <li key={guide.slug}><Link href={`/guides/${guide.slug}`} className="block py-5 text-lg font-semibold tracking-tight underline-offset-4 hover:underline">{guide.title}</Link></li>)}</ul></section>}
      <nav aria-label="Related Bengaluru advertising pages" className="mt-16 border-t border-black/15 pt-8"><h2 className="text-xl font-semibold tracking-tight">Explore advertising in Bengaluru</h2><ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium underline underline-offset-4"><li><Link href="/digital-advertising-bengaluru">Digital advertising in Bengaluru</Link></li><li><Link href="/cab-advertising-bengaluru">Cab advertising in Bengaluru</Link></li><li><Link href="/outdoor-advertising-bengaluru">Digital outdoor advertising in Bengaluru</Link></li><li><Link href="/small-business-advertising-bangalore">Advertising for small businesses</Link></li></ul></nav></section>
  <section className="container-ooro max-w-5xl pb-8"><h2 className="text-2xl font-semibold tracking-tight">How to use these advertising guides</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-700">The guides are for businesses comparing local advertising formats, setting a test budget and preparing campaign creative. They explain planning concepts and OORO’s own service scope. They are not a quote, coverage guarantee or legal advice. For any media proposal, verify the format, dates, production costs, permissions, cancellation terms and delivery evidence with the operator.</p><p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-700">Start with <Link className="underline" href="/bengaluru">advertising in Bengaluru</Link> for OORO’s local offering, or use the individual guides to compare <Link className="underline" href="/guides/outdoor-advertising-bangalore">outdoor formats</Link>, <Link className="underline" href="/guides/set-local-advertising-budget">budget planning</Link> and <Link className="underline" href="/guides/dooh-creative-specifications">creative preparation</Link>.</p></section>
<ContentFaq title="About the guides" items={[
 {question:"Are the guide examples OORO price quotes?",answer:"No. Guides explain planning considerations. Prices and booking terms are specific to each provider and campaign and should be confirmed in writing."},
 {question:"Do neighborhood examples mean OORO has confirmed coverage there?",answer:"No. Location examples help frame a brief. OORO confirms eligible screens and availability for the requested dates before booking."},
 {question:"How should I use a campaign estimate?",answer:"Treat an estimate as a planning input and ask what assumptions it uses. Compare it with confirmed inventory and the final terms, then evaluate delivery using evidence the provider actually reports."}
]} /></PublicPage>;
}
