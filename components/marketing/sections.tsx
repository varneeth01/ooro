import { ArrowUpRight, ChevronRight, MapPin, Radio, Route, Sparkles } from "lucide-react";
import { WorkflowSteps } from "./product/workflow-steps";
import { CityNetwork } from "./city-network";

const networkCards = [
  ["01", "Moving media", "Digital displays travel with the city, turning everyday routes into media space."],
  ["02", "Location-aware", "Campaigns can adapt to where vehicles move and where attention is happening."],
  ["03", "Real-world attention", "Reach people outside traditional screens—on roads, near markets and around stores."],
  ["04", "City by city", "OORO grows through local networks, starting in Tirupati and expanding with demand."],
];

export function Tirupati() {
  return <section id="tirupati" className="section-sm bg-[var(--background)]"><div className="container-ooro"><div className="grid gap-12 lg:grid-cols-[1fr_.8fr] lg:items-end"><div><span className="eyebrow text-neutral-500">The first OORO city</span><h2 className="display mt-5 max-w-2xl text-5xl font-medium sm:text-6xl lg:text-[76px]">Starting in Tirupati.</h2></div><div><p className="max-w-md text-lg leading-8 text-neutral-500">We&apos;re building OORO&apos;s first mobility media network in Tirupati—connecting vehicles, neighborhoods, businesses and brands through moving digital displays.</p><div className="mt-8 flex items-center gap-3 text-xs font-medium"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand-yellow)]"/> Tirupati · Andhra Pradesh · India</div></div></div><div className="mt-16 grid border-y border-neutral-300 md:grid-cols-3"><div className="border-b border-neutral-300 py-6 md:border-b-0 md:border-r md:px-6 md:py-8 md:first:pl-0"><MapPin size={17}/><h3 className="mt-10 text-2xl font-medium">A city in motion</h3><p className="mt-3 max-w-[240px] text-sm leading-6 text-neutral-500">A launch network built around how Tirupati actually moves.</p></div><div className="border-b border-neutral-300 py-6 md:border-b-0 md:border-r md:px-6 md:py-8"><Route size={17}/><h3 className="mt-10 text-2xl font-medium">Local by design</h3><p className="mt-3 max-w-[240px] text-sm leading-6 text-neutral-500">Useful for brands, businesses, drivers and the city around them.</p></div><div className="py-6 md:px-6 md:py-8 md:pr-0"><Radio size={17}/><h3 className="mt-10 text-2xl font-medium">Launching here</h3><p className="mt-3 max-w-[240px] text-sm leading-6 text-neutral-500">Be part of OORO&apos;s first city network as it comes online.</p></div></div></div></section>;
}

export function Network() {
  return <section id="network" className="section-md bg-[#0b0b0b] text-white"><div className="container-ooro"><div className="mb-12 flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><span className="eyebrow text-neutral-500">The OORO network</span><h2 className="display mt-5 max-w-2xl text-5xl font-medium lg:text-[70px]">Every route can become media.</h2></div><p className="max-w-sm text-lg leading-8 text-neutral-400">A new layer of real-world advertising, carried through the movement of the city.</p></div><div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2">{networkCards.map(([number, title, copy]) => <article key={number} className="bg-[#0b0b0b] p-6 sm:p-8"><div className="flex items-center justify-between text-[11px] text-neutral-500"><span className="font-mono">{number}</span><Sparkles size={16} className="text-[var(--brand-yellow)]"/></div><h3 className="mt-20 text-2xl font-medium">{title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-neutral-400">{copy}</p></article>)}</div><div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-neutral-300"><span className="text-[var(--brand-yellow)]">One network.</span> Many moving moments.</p><span className="text-[11px] text-neutral-500">BUILT FOR TIRUPATI FIRST</span></div></div></section>;
}

export function HowItWorks() {
  return <section id="how-it-works" className="border-y border-neutral-200 bg-[var(--background)]"><div className="container-ooro section-sm"><div className="mb-14 flex items-end justify-between gap-6"><div><span className="eyebrow text-neutral-500">A simple campaign flow</span><h2 className="display mt-5 text-4xl font-medium sm:text-5xl">From idea to street.</h2></div><span className="hidden text-sm text-neutral-500 md:block">01 — 03</span></div><WorkflowSteps/></div></section>;
}

export function Brands() {
  return <section id="brands" className="section-md bg-[#ecece7]"><div className="container-ooro grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><span className="eyebrow text-neutral-500">For brands</span><h2 className="display mt-5 max-w-2xl text-5xl font-medium lg:text-[70px]">Your audience doesn&apos;t live inside one screen.</h2></div><div><p className="max-w-md text-lg leading-8 text-neutral-500">OORO helps brands reach people where real life happens—on roads, near markets, outside stores and across the city.</p><a href="#waitlist" className="mt-8 inline-flex items-center gap-3 text-sm font-medium hover:underline">Talk to OORO <ArrowUpRight size={15}/></a></div></div></section>;
}

export function About() {
  return <section id="about" className="container-ooro section-sm"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><span className="eyebrow text-neutral-500">About OORO</span><h2 className="display mt-5 text-5xl font-medium lg:text-[64px]">Building the media network outside the screen.</h2></div><div className="self-end space-y-5 text-lg leading-8 text-neutral-500"><p>OORO is building a new kind of advertising network—one that moves through cities instead of waiting for people to open an app.</p><p>Starting in Tirupati and expanding city by city.</p></div></div></section>;
}

export function FinalCta() {
  return <section id="waitlist" className="relative overflow-hidden bg-[#090909] text-white"><div className="absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[var(--brand-yellow)] opacity-[.08] blur-3xl"/><div className="container-ooro section-sm relative flex flex-col gap-10"><h2 className="display max-w-3xl text-5xl font-medium sm:text-6xl lg:text-[82px]">Bring OORO to your city.</h2><p className="max-w-md text-lg leading-8 text-neutral-400">Tirupati is first. Join the waitlist and help us decide where OORO moves next.</p><a className="w-fit rounded-[8px] bg-[var(--brand-yellow)] px-5 py-3.5 text-sm font-medium text-black transition hover:-translate-y-px hover:brightness-95" href="#cities">Explore the city network <ChevronRight className="ml-5 inline" size={15}/></a></div></section>;
}

export function Cities() {
  return <section id="cities" className="border-y border-neutral-200 bg-[#efefeb]"><div className="container-ooro section-md"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><span className="eyebrow text-neutral-500">The expansion roadmap</span><h2 className="display mt-5 max-w-xl text-5xl font-medium lg:text-[68px]">OORO, city by city.</h2><p className="mt-8 max-w-md text-lg leading-8 text-neutral-500">Tirupati is live in the launch plan. Other cities unlock through local demand from brands, businesses and vehicle owners.</p></div><CityNetwork/></div></div></section>;
}
