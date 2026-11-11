import type { Metadata } from "next";
import Link from "next/link";
import { PublicPage } from "@/components/marketing/public-page";
import { guides } from "@/content/guides";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("guides", "Advertising Guides for Bengaluru Businesses", "Practical, clearly sourced guidance on local advertising, campaign planning, digital out-of-home and creative preparation.");
export default function GuidesPage() {
  const published = guides.filter(g => !g.outline);
  return <PublicPage eyebrow="OORO / Field notes" title="A clearer way to plan local advertising." description="Practical guidance for Bengaluru businesses comparing formats, setting budgets and preparing campaigns. We separate verified details from assumptions.">
    <section className="container-ooro py-16 sm:py-24"><p className="text-xs font-semibold uppercase tracking-[.15em] text-neutral-600">Guides / {published.length} articles</p><div className="mt-8 divide-y divide-black/15 border-y border-black/15">{published.map((guide, i) => <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group grid gap-4 py-7 md:grid-cols-[5rem_1fr_auto] md:items-center"><span className="text-sm tabular-nums text-neutral-600">0{i + 1}</span><span><span className="block text-xl font-semibold tracking-tight group-hover:underline">{guide.title}</span><span className="mt-2 block max-w-3xl text-sm leading-6 text-neutral-600">{guide.description}</span></span><span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">↗</span></Link>)}</div><div className="mt-12"><Link className="inline-flex min-h-12 items-center rounded-xl bg-[#dfff00] px-6 font-semibold text-black" href="/advertise">Plan a campaign ↗</Link></div><nav aria-label="Related Bengaluru advertising pages" className="mt-16 border-t border-black/15 pt-8"><h2 className="text-xl font-semibold tracking-tight">Explore Bengaluru advertising options</h2><ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium underline underline-offset-4"><li><Link href="/outdoor-advertising-bengaluru">Outdoor advertising in Bengaluru</Link></li><li><Link href="/small-business-advertising-bangalore">Advertising for small businesses in Bangalore</Link></li></ul></nav></section>
  </PublicPage>;
}
