"use client";
import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, ChartNoAxesColumnIncreasing, Clapperboard, MapPinned } from "lucide-react";

const stories = [
 {number:"01",label:"Where",title:"Start with a place.",body:"Choose Bengaluru neighborhoods, the radius you want to reach and the dates you have in mind. OORO confirms actual availability before any booking.",Icon:MapPinned,caption:"Planning preview · Bengaluru"},
 {number:"02",label:"What",title:"Make the moment yours.",body:"Bring your artwork or video. OORO reviews the creative and schedules approved media on eligible in-vehicle screens.",Icon:Clapperboard,caption:"Creative preview · illustrative"},
 {number:"03",label:"Proof",title:"See what actually played.",body:"Understand supported playback records and campaign reporting—without confusing estimated reach with verified delivery.",Icon:ChartNoAxesColumnIncreasing,caption:"Reporting preview · illustrative"},
] as const;

function StoryGraphic({index}:{index:number}){
 if(index===0)return <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[#1e2422]">
  <div className="absolute inset-0 opacity-25" style={{backgroundImage:"linear-gradient(35deg,transparent 47%,#96aa7b 48%,#96aa7b 49%,transparent 50%),linear-gradient(125deg,transparent 47%,#96aa7b 48%,#96aa7b 49%,transparent 50%)",backgroundSize:"64px 64px"}}/>
  <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-[#dfff00]/50 bg-[#dfff00]/10 shadow-[0_0_0_35px_rgba(223,255,0,.05)] sm:h-56 sm:w-56"><MapPinned className="text-[#dfff00]" size={48}/><span className="absolute bottom-7 text-xs font-medium text-white">Bengaluru</span></div>
 </div>;
 if(index===1)return <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-[#161918] p-6"><div className="w-full max-w-[330px] -rotate-3 rounded-[22px] border-[9px] border-[#333737] bg-[#dfff00] p-6 text-black shadow-[15px_22px_35px_rgba(0,0,0,.4)]"><p className="text-xs font-bold tracking-[.15em]">OORO / CREATIVE</p><p className="mt-12 text-4xl font-black leading-[.95] tracking-tight sm:text-5xl">MORE<br/>TO SEE.</p><p className="mt-10 text-[10px] font-semibold">DISPLAY CONCEPT — NOT LIVE</p></div></div>;
 return <div className="flex aspect-[4/3] flex-col justify-between rounded-xl bg-[#171d1b] p-6 sm:p-9"><p className="text-sm text-neutral-300">Proof-of-play dashboard</p><div className="flex h-36 items-end gap-3">{[38,70,50,82,56,95,67].map((height,i)=><div key={i} className="flex-1 rounded-t-md bg-[#dfff00]" style={{height:height+"%"}}/>)}</div><p className="text-xs text-neutral-400">Illustrative chart · no real campaign figures</p></div>;
}
function MobileStories(){return <div className="space-y-7 pb-16 md:hidden">{stories.map((s,i)=><article key={s.number} className="overflow-hidden rounded-2xl bg-[#111513] p-4 text-white"><StoryGraphic index={i}/><div className="px-2 pb-4 pt-6"><span className="text-xs font-semibold tracking-wide text-[#dfff00]">{s.number} / {s.label}</span><h3 className="mt-3 text-2xl font-semibold tracking-tight">{s.title}</h3><p className="mt-3 text-base leading-7 text-neutral-300">{s.body}</p></div></article>)}</div>}
function StoryFrame({index,progress}:{index:number;progress:ReturnType<typeof useSpring>}) {
 const start=index/3,stop=(index+1)/3,enter=Math.max(0,start-.03),leave=Math.min(1,stop+.04);
 const opacity=useTransform(progress,[enter,Math.min(enter+.09,stop),Math.max(start+.12,stop-.09),leave],[index===0?1:0,1,1,index===2?1:0]);
 const translate=useTransform(progress,[start,stop],[16,-16]);
 const story=stories[index];
 return <motion.article aria-hidden={false} style={{opacity,y:translate}} className="pointer-events-none absolute inset-0 flex flex-col justify-center">
   <StoryGraphic index={index}/>
   <div className="mt-5 flex items-center justify-between text-xs text-neutral-500"><span>{story.caption}</span><span>{story.number} / 03</span></div>
 </motion.article>;
}
export function ImmersiveShowcase(){
 const reduced=useReducedMotion();
 const ref=useRef<HTMLElement>(null);
 const {scrollYProgress}=useScroll({target:ref,offset:["start start","end end"]});
 const progress=useSpring(scrollYProgress,{stiffness:90,damping:30,mass:.35});
 const bar=useTransform(progress,[0,1],["0%","100%"]);
 return <section id="experience" ref={ref} className="relative scroll-mt-28 bg-[#f6f7f3] text-[#101210]">
  <div className="container-ooro pb-3 pt-20 sm:pt-28"><h2 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">From a place on the map to <span className="text-[#66724d]">a moment that matters.</span></h2><p className="mt-5 max-w-xl text-base leading-7 text-neutral-600">A simpler way to plan mobility advertising, deliver approved creatives, and understand playback.</p></div>
  <div className="container-ooro md:hidden"><MobileStories/></div>
  {reduced?<div className="container-ooro hidden gap-10 pb-24 md:grid">{stories.map((s,i)=><div key={s.number} className="grid items-center gap-8 md:grid-cols-2"><div><h3 className="text-3xl font-semibold">{s.title}</h3><p className="mt-4 text-base leading-7 text-neutral-600">{s.body}</p></div><StoryGraphic index={i}/></div>)}</div>:<div className="relative hidden h-[230vh] md:block"><div className="sticky top-0 flex h-screen items-center"><div className="container-ooro grid w-full items-center gap-14 lg:grid-cols-[.85fr_1.15fr]">
    <div><span className="text-sm font-medium text-neutral-500">An OORO campaign, in three moments</span><div className="mt-9 space-y-8">{stories.map((s,i)=><StoryCopy key={s.number} index={i} progress={progress} title={s.title} body={s.body} />)}</div><Link href="/advertise" className="mt-8 inline-flex min-h-12 items-center gap-2 text-sm font-semibold underline underline-offset-4 hover:text-[#53632d] focus-visible:outline-2 focus-visible:outline-offset-4">Plan a Bengaluru campaign <ArrowUpRight size={17}/></Link></div>
    <div className="relative h-[430px] lg:h-[510px]">{stories.map((s,i)=><StoryFrame key={s.number} index={i} progress={progress}/>)}</div>
   </div></div><div className="pointer-events-none absolute bottom-0 inset-x-0 h-[3px] bg-[#d9ded2]"><motion.div style={{width:bar}} className="h-full bg-[#6b8129]"/></div></div>}
 </section>;
}
function StoryCopy({index,progress,title,body}:{index:number;progress:ReturnType<typeof useSpring>;title:string;body:string}){
 const start=index/3,stop=(index+1)/3;
 const opacity=useTransform(progress,[Math.max(0,start-.04),Math.min(start+.08,stop),Math.max(start+.12,stop-.08),Math.min(1,stop+.04)],[index===0?1:.36,1,1,index===2?1:.36]);
 return <motion.div style={{opacity}} className="border-l border-[#abb6a0] pl-5"><p className="text-xs font-semibold text-[#596944]">{String(index+1).padStart(2,"0")} / 03</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-neutral-600">{body}</p></motion.div>;
}
