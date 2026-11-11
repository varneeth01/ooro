import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { PublicPage } from "@/components/marketing/public-page";
import { EmailContactButton } from "@/components/marketing/email-contact-button";
import { pageMetadata } from "@/lib/seo";
import { ContentFaq } from "@/components/marketing/content-faq";
export const metadata: Metadata = pageMetadata("contact", "Contact OORO — Advertising and Careers Enquiries", "Contact OORO about Bengaluru advertising campaigns, internships, partnerships or website questions.");
const topics = [
 {title:"Advertising enquiry",description:"Explore screen advertising for your business in Bengaluru.",href:"/advertise",label:"Plan a campaign"},
 {title:"Careers and internships",description:"See our Android and full-stack web developer internship openings.",href:"/careers",label:"View openings"},
 {title:"Company and partnerships",description:"Learn more about OORO and the team behind the network.",href:"/about",label:"About OORO"},
] as const;
export default function ContactPage(){return <PublicPage title="Talk with OORO about your next campaign." description="Choose the right route for advertising enquiries, internship applications, company questions or privacy requests. OORO is based in Bengaluru, India." size="compact" primaryAction={{href:"/advertise",label:"Plan an advertising campaign"}} secondaryAction={{href:"#contact-options",label:"Choose a contact topic"}}>
  <section id="contact-options" className="container-ooro scroll-mt-24 py-16 sm:py-24"><div className="grid gap-5 md:grid-cols-3">{topics.map(x=><article key={x.title} className="flex flex-col border border-neutral-300 bg-white p-7"><h2 className="text-xl font-semibold">{x.title}</h2><p className="mt-4 flex-1 text-sm leading-7 text-neutral-600">{x.description}</p><Link className="mt-8 inline-flex min-h-11 items-center gap-2 font-semibold text-[#43570b] underline underline-offset-4" href={x.href}>{x.label} <ArrowUpRight size={17}/></Link></article>)}</div>
   <div className="mt-12 border-t border-neutral-300 pt-8"><p className="flex items-center gap-2 text-sm font-semibold"><MapPin size={17}/> Bengaluru, Karnataka, India</p><p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">For internship applications, email <EmailContactButton email="varneeth@theooro.com" className="font-semibold underline underline-offset-4"/>. For other operational enquiries, use <EmailContactButton email="jay@theooro.com" className="font-semibold underline underline-offset-4"/>. For privacy requests, mention “Privacy request” in the subject. This page does not collect personal information or accept attachments.</p></div>
  </section><ContentFaq title="Contact and enquiry questions" items={[
 {question:"Where should I send an advertising enquiry?",answer:"Use the advertising enquiry card to begin a campaign request. Include your business, objective, preferred area, dates and budget so OORO can review the request against eligible inventory."},
 {question:"How do I apply for an internship?",answer:"Review the current openings on the Careers page first. For an application, use the internship email shown above and include the role, a short introduction and links to relevant work."},
 {question:"Can I submit private documents or campaign artwork here?",answer:"This contact page does not collect form submissions or attachments. Do not email sensitive personal or payment information. Campaign artwork should be shared through an approved workflow when requested."}
]} /></PublicPage>}
