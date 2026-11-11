import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPage } from "@/components/marketing/public-page";
import { guides } from "@/content/guides";
import { ContentFaq } from "@/components/marketing/content-faq";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const published = guides.filter(g => !g.outline);
const relatedGuideMap: Record<string, string[]> = {
  "advertise-business-bengaluru": ["small-business-marketing-ideas-bengaluru", "dooh-campaign-brief-bengaluru", "set-local-advertising-budget"],
  "outdoor-advertising-bangalore": ["digital-vs-outdoor-advertising", "how-outdoor-advertising-works-bengaluru", "mobile-dooh-vs-digital-billboards"],
  "auto-rickshaw-advertising": ["mobile-dooh-vs-digital-billboards", "dooh-creative-specifications", "proof-of-play-dooh"],
  "set-local-advertising-budget": ["small-business-marketing-ideas-bengaluru", "dooh-campaign-brief-bengaluru", "advertise-business-bengaluru"],
  "dooh-creative-specifications": ["dooh-ad-creative-best-practices", "dooh-campaign-brief-bengaluru", "auto-rickshaw-advertising"],
  "digital-vs-outdoor-advertising": ["what-is-dooh-advertising-bengaluru", "dooh-vs-social-ads-bengaluru", "mobile-dooh-vs-digital-billboards"],
  "small-business-marketing-ideas-bengaluru": ["restaurant-local-advertising", "advertise-business-bengaluru", "set-local-advertising-budget"],
  "dooh-campaign-brief-bengaluru": ["advertise-business-bengaluru", "dooh-creative-specifications", "set-local-advertising-budget"],
};
const sectionId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export function generateStaticParams() { return published.map(g => ({ slug: g.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = published.find(g => g.slug === slug); return guide ? pageMetadata(`guides/${guide.slug}`, guide.title, guide.description) : {};
}
function paragraph(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^\)]+\))/g);
  return parts.map((part, i) => { const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/); return match ? <Link key={i} className="underline decoration-[#829d00] underline-offset-4" href={match[2]}>{match[1]}</Link> : part; });
}
export default async function GuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = published.find(g => g.slug === slug); if (!guide) notFound();
  const reviewedLabel = guide.dateModified
    ? new Date(`${guide.dateModified}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : "11 November 2026";
  const schema = articleJsonLd(guide.slug, guide.title, guide.description, guide.dateModified ?? "2026-11-11");
  const breadcrumbs = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: guide.title, path: `/guides/${guide.slug}` }]);
  const stopWords = new Set(["a", "and", "in", "for", "the", "what", "how", "to", "vs", "with", "bengaluru", "bangalore", "advertising", "ads", "ad"]);
  const relatedSlugs = relatedGuideMap[guide.slug] ?? published.filter(item => item.slug !== guide.slug).map(item => {
    const topics = new Set(`${guide.slug} ${guide.title}`.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stopWords.has(word)));
    const candidateTopics = `${item.slug} ${item.title}`.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !stopWords.has(word));
    const score = candidateTopics.reduce((total, word) => total + Number(topics.has(word)), 0);
    return { slug: item.slug, score };
  }).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.slug);
  const related = relatedSlugs.map(relatedSlug => published.find(item => item.slug === relatedSlug)).filter((item): item is (typeof published)[number] => Boolean(item && item.slug !== guide.slug)).slice(0, 3);
  const words = [guide.intro, ...guide.sections.flatMap(section => [section.title, ...section.paragraphs]), ...(guide.faqs?.flatMap(faq => [faq.question, faq.answer]) ?? [])].join(" ").trim().split(/\s+/).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 220));
  return <PublicPage eyebrow="OORO Guides / Bengaluru" title={guide.title} description={guide.intro} size="compact" primaryAction={{ href: "/advertise", label: "Plan a campaign" }} secondaryAction={{ href: "/guides", label: "Browse all guides" }}>
    <article className="container-ooro max-w-5xl py-14 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-600"><ol className="flex gap-2"><li><Link href="/">Home</Link></li><li aria-hidden="true">/</li><li><Link href="/guides">Guides</Link></li><li aria-hidden="true">/</li><li aria-current="page" className="line-clamp-1">{guide.title}</li></ol></nav>
      {guide.slug === "auto-rickshaw-advertising" && <div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-xl bg-neutral-200"><Image src="/field/ooro-bengaluru-auto-01.webp" alt="An OORO digital display installed inside an auto-rickshaw in Bengaluru" fill priority sizes="(max-width: 768px) calc(100vw - 40px), 960px" className="object-cover" /></div>}
      <p className="mt-8 text-sm text-neutral-600">OORO Editorial <span aria-hidden="true">·</span> {readingMinutes} min read <span aria-hidden="true">·</span> Reviewed {reviewedLabel}</p>
      <nav aria-label="On this page" className="mt-8 border-y border-black/15 py-6"><h2 className="text-sm font-semibold">In this guide</h2><ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-neutral-700">{guide.sections.map(section => <li key={section.title}><a className="underline decoration-black/30 underline-offset-4 hover:decoration-black" href={`#${sectionId(section.title)}`}>{section.title}</a></li>)}</ul></nav>
      {guide.sections.map(section => <section id={sectionId(section.title)} key={section.title} className="scroll-mt-24 mt-12 border-t border-black/15 pt-7"><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2><div className="mt-5 max-w-3xl space-y-5 text-base leading-8 text-neutral-700">{section.paragraphs.map((p, i) => <p key={i}>{paragraph(p)}</p>)}</div></section>)}
      {guide.faqs?.length ? <ContentFaq title="Common questions" items={guide.faqs} /> : null}
      {guide.sources?.length ? <aside className="mt-12 border-t border-black/15 pt-7"><h2 className="text-lg font-semibold">Sources and further reading</h2><ul className="mt-4 list-disc space-y-2 pl-5 text-sm">{guide.sources.map(s => <li key={s.href}><a className="underline underline-offset-4" href={s.href} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul></aside> : null}
      <aside className="mt-14 rounded-xl bg-[#101210] p-7 text-white sm:p-10"><h2 className="text-2xl font-semibold">Planning a campaign in Bengaluru?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">Explore OORO&apos;s passenger-facing screen format. Requests are subject to creative review, eligible inventory and confirmed terms.</p><Link href="/advertise" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-[#dfff00] px-5 font-semibold text-black">Plan a campaign ↗</Link></aside>
      <div className="mt-14"><h2 className="text-xl font-semibold">Related guides</h2><ul className="mt-4 grid gap-3 sm:grid-cols-3">{related.map(g => <li key={g.slug}><Link className="block h-full border border-black/15 p-4 text-sm font-medium hover:bg-white" href={`/guides/${g.slug}`}>{g.title} ↗</Link></li>)}</ul></div>
    </article><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
  </PublicPage>;
}
