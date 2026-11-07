import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Clapperboard,
  MapPin,
  MoveUpRight,
  Play,
  Radio,
  Route,
} from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import "./field-home.css";
import { FieldMotion } from "@/components/marketing/field-motion";

const journey = [
  { number: "01", title: "Tell us where you want to be seen.", body: "Choose Bengaluru neighborhoods, campaign dates and your budget. We'll review the available inventory.", icon: MapPin },
  { number: "02", title: "Bring your brand to the screen.", body: "Share your image or video creative. OORO reviews it before scheduling.", icon: Clapperboard },
  { number: "03", title: "We confirm before it goes live.", body: "Our team confirms eligible screens, timing and your campaign details.", icon: BadgeCheck },
  { number: "04", title: "See what was delivered.", body: "Review supported proof-of-play and distinguish measured delivery from estimates.", icon: Radio },
] as const;

const reasons = [
  { number: "01", title: "A different kind of attention.", copy: "Reach passengers in a real-world setting, outside the usual scroll." },
  { number: "02", title: "Made for neighborhood businesses.", copy: "Start with the parts of Bengaluru that matter to you, subject to screen availability." },
  { number: "03", title: "Real operations. Clear reporting.", copy: "Campaign planning, creative review and supported playback evidence in one flow." },
] as const;

export function FieldHome() {
  return (
    <main id="main-content" className="field-site bg-[#0a0b0a] text-[#f5f6f1]">
      <div className="field-noise pointer-events-none" aria-hidden="true" />
      <FieldMotion />
      <Navbar />

      <section className="field-hero relative isolate overflow-hidden pt-32 sm:pt-36 lg:pt-40" aria-labelledby="field-title">
        <div className="field-container grid items-center gap-12 pb-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:pb-24">
          <div className="field-intro relative z-10 max-w-[640px]">
            <p className="field-kicker field-rise">OORO <span className="mx-2 text-white/25">/</span> Bengaluru, India</p>
            <h1 id="field-title" className="field-rise field-headline mt-6 max-w-[730px] text-[clamp(3.4rem,6vw,7.5rem)] font-semibold leading-[.94] tracking-[-.075em]">
              Your next customer could be in <em className="field-highlight not-italic">the next auto.</em>
            </h1>
            <p className="field-rise mt-7 max-w-[510px] text-lg leading-[1.65] text-white/65 sm:text-xl">
              OORO brings digital advertising inside everyday auto journeys. Built for brands that want to show up in the real world.
            </p>
            <div className="field-rise mt-9 flex flex-wrap items-center gap-3">
              <Link href="/advertise" className="field-button-primary group">
                Plan your campaign <ArrowUpRight size={18} strokeWidth={2.2} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link href="/how-it-works" className="field-button-secondary group">
                How OORO works <ArrowRight size={17} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="field-rise mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/15 pt-6 text-xs font-medium tracking-[.015em] text-white/55 sm:text-sm">
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#dbfc29]" aria-hidden="true" /> On-ground Bengaluru rollout</span>
              <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#dbfc29]" aria-hidden="true" /> Screen availability confirmed before booking</span>
            </div>
          </div>
          <div className="field-hero-media relative min-w-0" aria-label="OORO team alongside auto-rickshaws in Bengaluru">
            <div className="field-photo-primary relative isolate overflow-hidden bg-[#242923]">
              <Image
                src="/field/ooro-bengaluru-auto-01.webp"
                alt="OORO team member with an auto driver beside a Bengaluru auto-rickshaw"
                fill
                sizes="(max-width: 1024px) 80vw, 37vw"
                priority
                className="object-cover object-[50%_42%]"
              />
              <div className="field-photo-gradient pointer-events-none absolute inset-0" aria-hidden="true" />
              <div className="field-photo-caption absolute bottom-5 left-5 right-5 z-10 flex items-end justify-between gap-4 text-white sm:bottom-7 sm:left-7">
                <div><span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-white/65">From the field</span><span className="mt-1 block text-base font-semibold">Bengaluru rollout</span></div>
                <span className="field-photo-index">01 / 02</span>
              </div>
            </div>
            <div className="field-photo-secondary relative overflow-hidden bg-[#20231d]">
              <Image
                src="/field/ooro-bengaluru-auto-02.webp"
                alt="OORO team member meeting an auto-rickshaw driver during Bengaluru field operations"
                fill
                sizes="(max-width: 1024px) 42vw, 23vw"
                className="object-cover object-[52%_35%]"
              />
            </div>
            <div className="field-floating-label pointer-events-none absolute -bottom-5 right-2 hidden items-center gap-3 bg-[#e5ff35] px-4 py-3 text-[#10130a] shadow-xl sm:flex lg:-right-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/20"><Route size={16} /></span>
              <span className="text-[11px] font-bold uppercase tracking-[.12em]">Built on the streets<br />not just on slides.</span>
            </div>
          </div>
        </div>
        <div className="field-container">
          <div className="grid border-y border-white/15 py-6 text-[11px] font-semibold uppercase tracking-[.14em] text-white/60 sm:grid-cols-3 sm:divide-x sm:divide-white/10">
            <span className="py-2 sm:pr-6">01 / Passenger-facing displays</span>
            <span className="py-2 sm:px-6">02 / Campaigns for local businesses</span>
            <span className="py-2 sm:pl-6">03 / Playback reporting where supported</span>
          </div>
        </div>
      </section>

      <section id="experience" aria-labelledby="field-process" className="field-section">
        <div className="field-container">
          <div className="field-section-top grid gap-6 lg:grid-cols-[.8fr_1fr] lg:items-end">
            <div><p className="field-kicker">The process / 01</p><h2 id="field-process" className="field-title mt-5">Less guesswork.<br /><span className="text-[#b2b8ab]">More clarity.</span></h2></div>
            <p className="max-w-lg text-base leading-8 text-white/55 lg:justify-self-end">From the first campaign brief to what can actually be delivered. A simple process with people behind it.</p>
          </div>
          <div className="mt-12 grid border-t border-white/20 sm:grid-cols-2 lg:grid-cols-4">
            {journey.map(({ number, title, body, icon: Icon }) => (
              <article key={number} className="field-step group border-b border-white/15 px-1 py-8 transition-colors duration-300 hover:bg-white/[.035] sm:px-6 lg:border-r lg:first:pl-0 lg:last:border-r-0">
                <div className="flex items-center justify-between"><span className="text-[11px] font-semibold tracking-[.2em] text-[#dfff00]">{number}</span><Icon size={21} strokeWidth={1.5} className="text-white/75 transition-colors duration-300 group-hover:text-[#dfff00]" aria-hidden="true" /></div>
                <h3 className="mt-12 max-w-[270px] text-[1.35rem] font-semibold leading-tight tracking-[-.035em]">{title}</h3>
                <p className="mt-4 max-w-[270px] text-sm leading-7 text-white/50">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="field-work" aria-labelledby="field-story-title" className="field-section border-t border-white/10 bg-[#121512]">
        <div className="field-container">
          <div className="grid gap-8 lg:grid-cols-[.8fr_1fr] lg:items-end">
            <div><p className="field-kicker">The people behind the network / 02</p><h2 id="field-story-title" className="field-title mt-5">Actually out there.<br /><span className="text-[#b2b8ab]">Actually building.</span></h2></div>
            <p className="max-w-xl text-base leading-8 text-white/55 lg:justify-self-end">Real autos, real conversations, real field work. This is what building an advertising network looks like before the dashboards and reports.</p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-[1.1fr_.9fr]">
            <figure className="field-feature-photo group relative min-h-[360px] overflow-hidden bg-[#252923] sm:min-h-[480px]">
              <Image src="/field/ooro-bengaluru-auto-02.webp" alt="OORO on-ground team beside an auto-rickshaw in Bengaluru" fill sizes="(max-width: 768px) 100vw, 56vw" className="object-cover object-[50%_37%] transition-transform duration-700 ease-out group-hover:scale-[1.035]" />
              <figcaption className="field-caption">Field operations <span className="ml-2 text-white/50">/ Bengaluru</span></figcaption>
            </figure>
            <div className="grid gap-4">
              <figure className="field-feature-photo group relative min-h-[230px] overflow-hidden bg-[#252923] sm:min-h-[270px]">
                <Image src="/field/ooro-bengaluru-auto-01.webp" alt="OORO team and auto driver during rollout" fill sizes="(max-width: 768px) 100vw, 35vw" className="object-cover object-[50%_43%] transition-transform duration-700 ease-out group-hover:scale-[1.035]" />
                <figcaption className="field-caption">People first <span className="ml-2 text-white/50">/ Every install</span></figcaption>
              </figure>
              <div className="field-video-panel relative flex min-h-[210px] flex-col justify-between overflow-hidden border border-white/10 bg-[#0c0e0c] p-6">
                <div className="flex items-center justify-between gap-3"><span className="field-kicker">Installation footage</span><Play size={18} aria-hidden="true" className="text-[#dfff00]" /></div>
                <video className="field-video mt-4 aspect-video w-full bg-black object-contain" controls playsInline preload="none" poster="/field/ooro-bengaluru-auto-01.webp" aria-label="OORO on-ground installation footage"><source src="/field/ooro-installation-01.mp4" type="video/mp4" />Your browser does not support the video element.</video>
                <p className="mt-3 text-xs leading-5 text-white/45">Original footage from the OORO team. Playback starts only when selected.</p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-xs leading-6 text-white/40">Photos and footage document field operations. They do not independently establish active screen counts or campaign delivery.</p>
        </div>
      </section>

      <section id="features" aria-labelledby="field-why" className="field-section">
        <div className="field-container">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
            <div><p className="field-kicker">Why OORO / 03</p><h2 id="field-why" className="field-title mt-5">A new place<br />for your brand.</h2><p className="mt-6 max-w-sm text-base leading-8 text-white/55">A more tangible way for local businesses and brands to show up around the city.</p><Link href="/for-brands" className="field-inline-link mt-8">Explore advertising with OORO <MoveUpRight size={16} aria-hidden="true" /></Link></div>
            <div className="border-t border-white/20">{reasons.map(({ number, title, copy }) => <div key={number} className="group grid gap-3 border-b border-white/15 py-8 sm:grid-cols-[55px_1fr_24px] sm:gap-5"><span className="text-xs font-semibold tracking-[.15em] text-[#dfff00]">{number}</span><div><h3 className="text-2xl font-semibold tracking-[-.04em]">{title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-white/50">{copy}</p></div><ArrowDownRight size={20} aria-hidden="true" className="hidden text-white/35 transition-transform duration-300 group-hover:-rotate-45 group-hover:text-[#dfff00] sm:block" /></div>)}</div>
          </div>
        </div>
      </section>

      <section id="solutions" aria-labelledby="field-audiences" className="field-section border-t border-white/10 bg-[#111411]">
        <div className="field-container">
          <p className="field-kicker">Built for your business / 04</p>
          <h2 id="field-audiences" className="field-title mt-5 max-w-3xl">Big brand or neighborhood favorite.<br /><span className="text-[#b2b8ab]">Your story deserves to be seen.</span></h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { title: "Local businesses", copy: "Make your business part of the journeys happening around your neighborhood.", href: "/advertise", action: "Start planning" },
              { title: "Growing brands", copy: "Build real-world visibility with a campaign designed around your goals.", href: "/for-brands", action: "Explore brands" },
              { title: "Agencies", copy: "Bring your clients into a different kind of media channel.", href: "/for-agencies", action: "Explore agencies" },
            ].map((item, index) => (
              <Link href={item.href} key={item.title} className="field-audience group flex min-h-[320px] flex-col justify-between border border-white/15 p-7 transition-colors duration-300 hover:border-[#dfff00]/60 hover:bg-white/[.035]">
                <div><span className="text-xs font-semibold tracking-[.14em] text-[#dfff00]">0{index + 1}</span><h3 className="mt-12 text-3xl font-semibold tracking-[-.05em]">{item.title}</h3><p className="mt-4 max-w-xs text-sm leading-7 text-white/55">{item.copy}</p></div>
                <span className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-sm font-semibold">{item.action}<ArrowUpRight size={18} className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="field-section" aria-labelledby="field-cta">
        <div className="field-container">
          <div className="field-final relative overflow-hidden border border-white/15 bg-[#dbff22] px-7 py-12 text-[#10130b] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <span className="text-[11px] font-bold uppercase tracking-[.2em]">The next move is yours.</span>
            <h2 id="field-cta" className="mt-6 max-w-4xl text-[clamp(2.8rem,6vw,6.8rem)] font-semibold leading-[.95] tracking-[-.075em]">Your next customer is out there.</h2>
            <div className="mt-9 flex flex-wrap items-end justify-between gap-7"><p className="max-w-lg text-base leading-7 text-black/65">Tell us who you want to reach. We'll help you understand the options available through OORO.</p><Link href="/advertise" className="field-button-dark group">Plan a campaign <ArrowUpRight size={18} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></Link></div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
