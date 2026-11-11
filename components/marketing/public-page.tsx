import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

type PublicAction = { href: string; label: string };

export function PublicPage({
  title,
  description,
  children,
  primaryAction = { href: "/advertise", label: "Plan a campaign" },
  secondaryAction = { href: "/how-it-works", label: "How OORO works" },
  size = "standard",
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  primaryAction?: PublicAction;
  secondaryAction?: PublicAction | null;
  size?: "standard" | "compact";
}) {
  return <div className="min-h-screen overflow-x-clip bg-[#f7f7f4] text-[#101210]">
    <a href="#page-content" className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-[#dfff00] px-4 py-3 text-sm font-semibold text-black focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Skip to content</a>
    <div className="relative overflow-hidden bg-[#080a09] text-white">
      <Navbar />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(ellipse_at_90%_55%,rgba(223,255,0,.09),transparent_65%)]" />
      <header className={`container-ooro relative ${size === "compact" ? "pb-14 pt-32 sm:pb-16 sm:pt-36" : "pb-16 pt-32 sm:pb-24 sm:pt-40"}`}>
        <h1 className={`${size === "compact" ? "max-w-4xl text-[clamp(2.5rem,5vw,4.75rem)]" : "max-w-5xl text-[clamp(2.65rem,6vw,5.5rem)]"} break-words font-semibold leading-[1.04] tracking-[-.035em]`}>{title}</h1>
        <p className="mt-6 max-w-[68ch] text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8">{description}</p>
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={primaryAction.href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#dfff00] px-6 py-3 text-sm font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00] motion-reduce:transition-none">{primaryAction.label}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          {secondaryAction && <Link href={secondaryAction.href} className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-neutral-200 underline decoration-white/50 underline-offset-4 hover:text-white focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#dfff00]">{secondaryAction.label}<ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </div>
      </header>
    </div>
    <main id="page-content" tabIndex={-1}>{children}</main>
    <Footer />
  </div>;
}

export function PublicSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="container-ooro py-16 sm:py-24"><h2 className="max-w-4xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">{title}</h2><div className="mt-8 max-w-4xl text-base leading-8 text-neutral-700">{children}</div></section>;
}

export function PublicCta({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#101210] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#343837] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#829d00] motion-reduce:transition-none">{children}<ArrowUpRight size={16} aria-hidden="true" /></Link>;
}
