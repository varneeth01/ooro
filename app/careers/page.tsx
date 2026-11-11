import type { Metadata } from "next";
import { Code2, Smartphone, MapPin, BriefcaseBusiness } from "lucide-react";
import { PublicPage } from "@/components/marketing/public-page";
import { EmailContactButton } from "@/components/marketing/email-contact-button";
import { pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("careers", "OORO Careers — Android and Full-Stack Developer Internships", "Explore two OORO internship openings in Android development and full-stack web development. Build real advertising technology for Bengaluru.");

const roles = [
 { slug:"android-developer-intern",title:"Android Development Intern", Icon:Smartphone, tag:"Android / Kotlin", intro:"Help develop and test Android applications for OORO's connected screen and driver experiences.", responsibilities:["Implement and improve Android screens and user journeys in Kotlin.","Help diagnose playback, connectivity and device behavior using logs and tests.","Write maintainable code, document changes and participate in code review."], skills:["Familiarity with Kotlin or Java and Android fundamentals.","Comfort using Android Studio, Git and debugging tools.","Interest in real-device testing, performance and reliability."] },
 { slug:"full-stack-developer-intern",title:"Full-Stack Web Development Intern",Icon:Code2,tag:"Web / TypeScript",intro:"Work on the advertiser-facing website and internal software that helps OORO plan and operate campaigns.",responsibilities:["Build accessible, mobile-friendly frontend experiences.","Contribute to TypeScript APIs and data-backed workflows with supervision.","Write tests, investigate bugs and improve performance and usability."],skills:["Basics of JavaScript/TypeScript, React and web fundamentals.","Familiarity with backend APIs, SQL or Node.js.","Care for semantic HTML, responsive design and version control."] },
] as const;

export default function CareersPage(){
const breadcrumbs=breadcrumbJsonLd([{name:"Home",path:"/"},{name:"Careers",path:"/careers"}]);
return <PublicPage title="Build the software and screens behind OORO." description="Explore two developer internship openings in Android and full-stack web development. Work on real devices and advertising technology for Bengaluru journeys." size="compact" primaryAction={{href:"#open-roles",label:"Explore open roles"}} secondaryAction={{href:"/contact",label:"Ask a careers question"}}>
  <section id="open-roles" className="container-ooro scroll-mt-24 py-20 sm:py-28">
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-300 pb-7"><div><p className="text-xs font-semibold uppercase tracking-widest text-[#5c6b18]">Opportunities</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Two internship openings</h2></div><p className="text-sm text-neutral-600">Working arrangement, duration and stipend to be confirmed during hiring.</p></div>
    <div className="grid gap-6 pt-9 lg:grid-cols-2">
      {roles.map(({slug,title,Icon,tag,intro,responsibilities,skills},i)=><article id={slug} key={slug} className="flex flex-col border border-[#d6dacd] bg-white p-7 shadow-sm sm:p-9">
        <div className="flex items-start justify-between gap-5"><span className="inline-flex h-12 w-12 items-center justify-center rounded bg-[#e9eddb] text-[#52650b]"><Icon size={24} aria-hidden="true"/></span><span className="font-mono text-xs text-neutral-500">0{i+1}/02</span></div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[.15em] text-[#697b22]">{tag} · Internship</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
        <p className="mt-5 text-sm leading-7 text-neutral-700">{intro}</p>
        <h4 className="mt-8 font-semibold">What you will work on</h4><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">{responsibilities.map(x=><li key={x}>{x}</li>)}</ul>
        <h4 className="mt-8 font-semibold">What helps</h4><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">{skills.map(x=><li key={x}>{x}</li>)}</ul>
        <div className="mt-auto border-t border-neutral-200 pt-8"><EmailContactButton email="varneeth@theooro.com" label="Apply by email" subject={`OORO Internship Application — ${title}`} body="Hello OORO team,\n\nI would like to apply for this internship. Please find my resume and portfolio/GitHub details attached or linked.\n\n" className="inline-flex min-h-12 w-full items-center justify-between gap-3 bg-[#111611] px-5 text-sm font-semibold text-white hover:bg-[#314015]"/></div>
      </article>)}
    </div>
    <div className="mt-14 grid gap-4 border-t border-neutral-300 pt-10 sm:grid-cols-3">
      <div><BriefcaseBusiness className="text-[#53640f]"/><h3 className="mt-3 font-semibold">Build with ownership</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Learn by working on practical product problems with review and guidance.</p></div>
      <div><Smartphone className="text-[#53640f]"/><h3 className="mt-3 font-semibold">Real devices and software</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Work spans mobile experiences, connected hardware and web platforms.</p></div>
      <div><MapPin className="text-[#53640f]"/><h3 className="mt-3 font-semibold">Built in Bengaluru</h3><p className="mt-2 text-sm leading-6 text-neutral-600">OORO&apos;s current operational focus is Bengaluru; internship work arrangements are discussed individually.</p></div>
    </div>
    <p className="mt-10 text-sm leading-7 text-neutral-600">OORO aims to assess candidates on relevant skills and potential. No application fee is required. Use the application link on each role card. Openings and terms may change; no offer is made until OORO confirms it directly.</p>
  </section>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(breadcrumbs)}}/>
</PublicPage>;
}
