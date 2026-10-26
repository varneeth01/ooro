import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
export function PublicPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }){
 return <main id="main-content" className="min-h-screen overflow-x-clip bg-[#f7f7f4] text-[#101210]">
  <div className="relative overflow-hidden bg-[#080a09] text-white"><Navbar/>
   <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(ellipse_at_90%_55%,rgba(223,255,0,.09),transparent_65%)]"/>
   <div className="container-ooro relative pb-20 pt-40 sm:pb-28 sm:pt-48">
    <p className="text-xs font-semibold tracking-[.13em] text-[#dfff00]">{eyebrow}</p>
    <h1 className="mt-6 max-w-5xl break-words text-[clamp(2.8rem,6.4vw,6rem)] font-semibold leading-[1.04] tracking-[-.04em]">{title}</h1>
    <p className="mt-7 max-w-[65ch] text-base leading-8 text-neutral-300 sm:text-lg">{description}</p>
    <div className="mt-9 flex flex-wrap items-center gap-4"><Link href="/advertise" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#dfff00] focus-visible:outline-2 focus-visible:outline-[#dfff00]">Plan advertising <ArrowUpRight size={16}/></Link><Link href="/how-it-works" className="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-neutral-200 underline underline-offset-4 hover:text-white">How OORO works <ArrowUpRight size={16}/></Link></div>
   </div>
  </div>{children}<Footer/>
 </main>;
}
export function PublicSection({ title, children }: {title:string;children:React.ReactNode}){
 return <section className="container-ooro py-16 sm:py-24"><h2 className="max-w-4xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">{title}</h2><div className="mt-8 max-w-4xl text-base leading-8 text-neutral-700">{children}</div></section>;
}
export function PublicCta({href,children}:{href:string;children:React.ReactNode}){
 return <Link href={href} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#101210] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#343837] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#829d00]">{children}<ArrowUpRight size={16}/></Link>;
}
