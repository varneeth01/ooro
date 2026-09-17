import Link from "next/link";
import { Footer } from "./footer";
import { Navbar } from "./navbar";

export function PublicPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="min-h-screen overflow-x-hidden bg-[#f7f7f5] text-black"><div className="hero-ambient text-white"><Navbar/><div className="container-ooro pb-20 pt-36"><p className="eyebrow text-neutral-400">{eyebrow}</p><h1 style={{ maxWidth: "15ch", overflowWrap: "anywhere" }} className="display w-full whitespace-normal break-words mt-5 text-4xl font-medium leading-[.98] sm:max-w-4xl sm:text-7xl">{title}</h1><p style={{ maxWidth: "34ch", overflowWrap: "anywhere" }} className="mt-8 w-full whitespace-normal break-words text-base leading-7 text-neutral-400 sm:max-w-2xl sm:text-lg sm:leading-8">{description}</p></div></div>{children}<Footer/></main>;
}

export function PublicSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="container-ooro py-16 sm:py-24"><h2 className="display max-w-2xl text-3xl font-medium sm:text-5xl">{title}</h2><div className="mt-8 max-w-3xl text-base leading-8 text-neutral-600">{children}</div></section>; }

export function PublicCta({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="inline-flex rounded-[8px] bg-black px-5 py-3.5 text-sm font-medium text-white">{children}</Link>; }
