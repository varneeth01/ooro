import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Cpu, MapPin, Megaphone } from "lucide-react";
import { PublicPage } from "@/components/marketing/public-page";
import { pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = pageMetadata(
  "about",
  "OORO Founders and Company — Bengaluru Mobility Advertising",
  "Learn what OORO does, where its mobility advertising network is focused, how campaigns are reviewed, and who is building the company."
);

const team = [
  {
    name: "Varneeth Varma Nandimandalam",
    role: "Founder & CEO",
    detail: "Leads OORO's product, technology platform and company direction as it builds advertising experiences for passenger journeys.",
    url: "https://www.linkedin.com/in/varneeth-varma-nandimandalam/",
    Icon: Cpu,
  },
  {
    name: "Siri Girish",
    role: "Co-founder & CMO",
    detail: "Leads brand strategy, marketing and growth for OORO's mobility advertising network.",
    url: "https://www.linkedin.com/in/siri-girish-7b7b65378/",
    Icon: Megaphone,
  },
  {
    name: "Jay Chandrudu Thammadi",
    role: "Co-founder, Hardware & Operations",
    detail: "Leads hardware research and development, connected display work and fleet operations.",
    url: null,
    Icon: Cpu,
  },
];

const companyQuestions = [
  {
    question: "What does OORO do?",
    answer: "OORO is building a mobility advertising platform for digital screens inside participating autos and other vehicles. It helps businesses request a campaign, submit creative for review, check eligible inventory and review playback information where supported.",
  },
  {
    question: "Where is OORO's network focused?",
    answer: "Bengaluru, Karnataka is OORO's initial launch focus. A city or neighbourhood preference is not a promise of route coverage. OORO confirms eligible screens, dates and commercial terms for each campaign request.",
  },
  {
    question: "What can OORO campaign reporting verify?",
    answer: "Playback records can describe whether approved creative played on a screen where reporting is supported. QR scans, when available, describe engagement. Playback does not by itself prove unique viewers, attention, store visits or sales.",
  },
  {
    question: "Who founded OORO?",
    answer: "OORO is being built by Varneeth Varma Nandimandalam, Founder and CEO; Siri Girish, Co-founder and CMO; and Jay Chandrudu Thammadi, Co-founder for Hardware and Operations.",
  },
];

export default function AboutPage() {
  const people = team.map(({ name, role, url }, index) => ({
    "@type": "Person",
    "@id": `${siteUrl}/about#founder-${index + 1}`,
    name,
    jobTitle: role,
    worksFor: { "@id": `${siteUrl}/#organization` },
    url: url ?? `${siteUrl}/about#founder-${index + 1}`,
    ...(url ? { sameAs: [url] } : {}),
  }));

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${siteUrl}/about#webpage`,
      url: `${siteUrl}/about`,
      name: "OORO Founders and Company",
      about: { "@id": `${siteUrl}/#organization` },
      mainEntity: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-IN",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "@id": `${siteUrl}/about#faq`,
      mainEntity: companyQuestions.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    },
    ...people.map((person) => ({ "@context": "https://schema.org", ...person })),
  ];

  return (
    <PublicPage
      eyebrow="Our story"
      title="Meet OORO's founders: building mobility advertising in Bengaluru."
      description="OORO is a Bengaluru mobility advertising company founded by Varneeth Varma Nandimandalam, Siri Girish and Jay Chandrudu Thammadi. Meet the team building connected screen advertising for everyday journeys."
    >
      <section className="container-ooro py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b692c]">
              <MapPin size={16} /> Bengaluru, India
            </span>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Why we are building OORO</h2>
            <p className="mt-5 text-base leading-8 text-neutral-700">
              OORO is building a mobility advertising platform around digital screens inside autos and cabs. The founders are focused on helping businesses plan local campaigns, getting approved creative onto eligible screens, and showing what playback records can verify.
            </p>
            <p className="mt-5 text-base leading-8 text-neutral-700">
              The company is starting in Bengaluru. Inventory, dates and commercial terms are reviewed for each campaign request, and playback evidence is described with its limits.
            </p>
            <Link className="mt-7 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4" href="/how-it-works">
              How OORO works <ArrowUpRight size={17} />
            </Link>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">OORO founders and leadership</h2>
            <div className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200">
              {team.map(({ name, role, detail, url, Icon }, index) => (
                <article id={`founder-${index + 1}`} key={name} className="grid gap-4 py-7 sm:grid-cols-[56px_1fr_auto] sm:items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e4e8d6] text-[#39452c]">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-neutral-500">{String(index + 1).padStart(2, "0")} / {role}</p>
                    <h3 className="mt-1 text-lg font-semibold">{name}</h3>
                    <p className="mt-2 text-sm leading-7 text-neutral-600">{detail}</p>
                  </div>
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">
                      LinkedIn profile <ArrowUpRight size={17} />
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-500">OORO team</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/10 bg-white">
        <div className="container-ooro py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#5b692c]">Company facts · reviewed 12 November 2026</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">OORO, clearly explained</h2>
          <dl className="mt-8 divide-y divide-neutral-200 border-y border-neutral-200">
            {companyQuestions.map(({ question, answer }) => (
              <div key={question} className="grid gap-3 py-6 sm:grid-cols-[.7fr_1.3fr] sm:gap-10">
                <dt className="text-base font-semibold">{question}</dt>
                <dd className="max-w-3xl text-sm leading-7 text-neutral-700">{answer}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs leading-6 text-neutral-500">
            This page describes OORO&apos;s public product focus. Current inventory and campaign terms are confirmed directly before booking.
          </p>
        </div>
      </section>

      <section className="container-ooro border-t border-black/10 py-12">
        <h2 className="text-2xl font-semibold tracking-tight">Explore OORO&apos;s work</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-700">Read the source pages for OORO&apos;s product, Bengaluru focus and campaign measurement approach.</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium">
          <Link className="underline underline-offset-4" href="/how-it-works">How campaigns work</Link>
          <Link className="underline underline-offset-4" href="/bengaluru">Advertising in Bengaluru</Link>
          <Link className="underline underline-offset-4" href="/digital-advertising-bengaluru">Digital advertising in Bengaluru</Link>
          <Link className="underline underline-offset-4" href="/methodology">Measurement methodology</Link>
          <Link className="underline underline-offset-4" href="/contact">Contact OORO</Link>
        </div>
      </section>
      {structuredData.map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
    </PublicPage>
  );
}
