import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "OORO founders and team",
  description: "Meet Varneeth Varma Nandimandalam, Sumanth Vasilanka and Siri Girish, the founding team building OORO, a smart mobility advertising network starting in Tirupati.",
  alternates: { canonical: "/about" },
  openGraph: { title: "OORO founders and team", description: "Meet the team building OORO's smart mobility advertising network from Tirupati, India.", url: "/about", type: "profile" },
};

const people = [
  ["Varneeth Varma Nandimandalam", "CEO and Founder", "https://www.linkedin.com/in/varneeth-varma-nandimandalam/"],
  ["Sumanth Vasilanka", "COO and Co-Founder", "https://www.linkedin.com/in/sumanth-vasilanka-6892902a9/"],
  ["Siri Girish", "CMO and Brand Strategist", "https://www.linkedin.com/in/siri-girish-7b7b65378/"],
];

export default function AboutPage() {
  return <main className="min-h-screen bg-[#f7f7f5] px-6 py-8 text-black sm:px-10"><Link href="/" className="text-sm font-medium">← OORO</Link><div className="mx-auto max-w-4xl pb-24 pt-24"><p className="eyebrow text-neutral-500">About OORO</p><h1 className="display mt-5 max-w-3xl text-5xl font-medium sm:text-7xl">The team building advertising that moves with your city.</h1><p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-500">OORO is a smart mobility advertising network starting in Tirupati, Andhra Pradesh, India. The founding team is building a more useful way for brands and businesses to reach people in the real world.</p><section className="mt-20" aria-labelledby="founders-heading"><h2 id="founders-heading" className="display text-3xl font-medium">OORO founders and leadership</h2><div className="mt-8 divide-y border-y border-neutral-300">{people.map(([name, role, url]) => <a className="flex items-center justify-between gap-6 py-6" href={url} target="_blank" rel="noreferrer" key={name}><span><strong className="block text-xl font-medium">{name}</strong><span className="mt-2 block text-neutral-500">{role}</span></span><span aria-hidden="true">↗</span></a>)}</div></section></div></main>;
}
