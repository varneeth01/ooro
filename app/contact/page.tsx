import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { pageMetadata } from "@/lib/seo";
export const metadata: Metadata = pageMetadata("contact", "Contact OORO — Advertising and Careers Enquiries", "Contact OORO about Bengaluru advertising campaigns, internships, partnerships or website questions.");
const topics = [
 {title:"Advertising enquiry",description:"Explore screen advertising for your business in Bengaluru.",href:"/advertise",label:"Plan a campaign"},
 {title:"Careers and internships",description:"See our Android and full-stack web developer internship openings.",href:"/careers",label:"View openings"},
 {title:"Company and partnerships",description:"Learn more about OORO and the team behind the network.",href:"/about",label:"About OORO"},
] as const;
export default function ContactPage(){return <main className="min-h-screen bg-[#f3f3ef] text-[#171a16]"><Navbar/>
  <section className="bg-[#0c100d] px-5 pb-16 pt-40 text-white sm:pb-24"><div className="container-ooro"><p className="text-xs font-semibold uppercase tracking-widest text-[#dfff00]">OORO / Contact</p><h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Let&apos;s build the next <span className="text-[#dfff00]">conversation.</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-300">Whether you&apos;re planning a campaign, interested in joining the team, or learning about OORO, start here.</p></div></section>
  <section className="container-ooro py-16 sm:py-24"><div className="grid gap-5 md:grid-cols-3">{topics.map(x=><article key={x.title} className="flex flex-col border border-neutral-300 bg-white p-7"><h2 className="text-xl font-semibold">{x.title}</h2><p className="mt-4 flex-1 text-sm leading-7 text-neutral-600">{x.description}</p><Link className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#43570b] underline underline-offset-4" href={x.href}>{x.label} <ArrowUpRight size={17}/></Link></article>)}</div>
   <div className="mt-12 border-t border-neutral-300 pt-8"><p className="flex items-center gap-2 text-sm font-semibold"><MapPin size={17}/> Bengaluru, Karnataka, India</p><p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">For internship applications, email <a className="font-semibold underline underline-offset-4" href="mailto:varneeth@theooro.com">varneeth@theooro.com</a>. For other operational enquiries, use <a className="font-semibold underline underline-offset-4" href="mailto:jay@theooro.com">jay@theooro.com</a>. For privacy requests, mention “Privacy request” in the subject. This page does not collect personal information or accept attachments.</p></div>
  </section><Footer/></main>}
