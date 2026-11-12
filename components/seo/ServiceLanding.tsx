import Link from "next/link";
import Image from "next/image";
import { PublicPage } from "@/components/marketing/public-page";
import { ContentFaq, type ContentFaqItem } from "@/components/marketing/content-faq";

function renderBody(text: string) {
  return text.split(/(\[[^\]]+\]\([^\)]+\))/g).map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    return match ? <Link key={i} className="underline decoration-[#829d00] underline-offset-4" href={match[2]}>{match[1]}</Link> : part;
  });
}

export function ServiceLanding({ eyebrow, title, intro, sections, image = false, faqs = [], finePrint }: { eyebrow: string; title: string; intro: string; sections: { title: string; body: string }[]; image?: boolean; faqs?: ContentFaqItem[]; finePrint?: string }) {
  return <PublicPage eyebrow={eyebrow} title={title} description={intro} size="compact" primaryAction={{ href: "/advertise", label: "Plan a campaign" }} secondaryAction={{ href: "/coverage", label: "Check OORO coverage" }}>
    {image && <div className="container-ooro pt-12"><div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-neutral-200"><Image src="/field/ooro-bengaluru-auto-02.webp" alt="OORO's passenger-facing display installed inside an auto-rickshaw in Bengaluru" fill priority sizes="(max-width: 768px) calc(100vw - 40px), 1200px" className="object-cover" /></div></div>}
    {finePrint && <aside className="container-ooro pt-5"><p className="max-w-4xl text-[11px] leading-5 text-neutral-500">{finePrint}</p></aside>}
    <article className="container-ooro max-w-5xl py-14 sm:py-20"><nav aria-label="Breadcrumb" className="text-sm text-neutral-600"><Link href="/">Home</Link><span className="px-2">/</span><span aria-current="page">{eyebrow}</span></nav>
      {sections.map(s => <section key={s.title} className="mt-12 border-t border-black/15 pt-7"><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{s.title}</h2>{s.body.split(/\n\n+/).map((paragraph, index) => <p key={index} className="mt-5 max-w-3xl text-base leading-8 text-neutral-700">{renderBody(paragraph)}</p>)}</section>)}
      <nav aria-label="Explore OORO" className="mt-12 flex flex-wrap gap-3">{[["Campaign planning", "/advertise"], ["How OORO works", "/how-it-works"], ["Advertising guides", "/guides"], ["Budget planning", "/tools/ad-budget-planner"]].map(([label, href]) => <Link key={href} className="rounded-full border border-black/20 px-4 py-3 text-sm hover:bg-white" href={href}>{label} ↗</Link>)}</nav>
    </article>
    {faqs.length > 0 && <ContentFaq items={faqs} />}
  </PublicPage>;
}
