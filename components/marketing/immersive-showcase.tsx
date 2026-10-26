"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, MapPinned, ScanLine, Clapperboard, ChartNoAxesCombined, ChevronDown } from "lucide-react";
const ease=[0.22,1,0.36,1] as const;
const slides=[
 {index:"01 / 03",eyebrow:"LOCAL RELEVANCE",title:"Meet people where the city moves.",description:"Build a campaign around a Bengaluru neighborhood and the routes you want to reach.",icon:MapPinned,word:"BENGALURU",micro:"CHOOSE A TARGET AREA"},
 {index:"02 / 03",eyebrow:"CREATIVE DELIVERY",title:"A moment worth looking at.",description:"Your approved artwork appears on connected displays inside autos and cabs, subject to confirmed inventory.",icon:Clapperboard,word:"YOUR BRAND",micro:"CREATIVE + SCHEDULING"},
 {index:"03 / 03",eyebrow:"MEASURABLE DELIVERY",title:"Understand what actually played.",description:"Track supported proof-of-play events and campaign reports. Estimates are never presented as verified impressions.",icon:ChartNoAxesCombined,word:"PROOF OF PLAY",micro:"REPORTING + VERIFICATION"},
];
function ShowcasePanel({index,scrollYProgress,reduced}:{index:number;scrollYProgress:ReturnType<typeof useScroll>["scrollYProgress"];reduced:boolean|null}){
 const start=index/3,end=(index+1)/3;
 const opacity=useTransform(scrollYProgress,[Math.max(0,start-.07),start+.08,end-.08,Math.min(1,end+.07)],[index===0?1:0,1,1,index===2?1:0]);
 const scale=useTransform(scrollYProgress,[start,end],[.94,1.03]);
 const y=useTransform(scrollYProgress,[start,end],[18,-18]);
 const step=slides[index];const Icon=step.icon;
 return <motion.article aria-label={step.eyebrow} style={reduced?{}:{opacity,scale,y}} className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#111417] p-6 text-white shadow-[0_45px_120px_rgba(0,0,0,.24)] sm:p-10 ${reduced && index!==0?"hidden":""}`}>
 <div className="relative z-10 flex items-start justify-between gap-4"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-semibold tracking-[.16em] text-neutral-300"><Icon size={14} className="text-[#dfff00]"/>{step.micro}</span><span className="font-mono text-xs text-neutral-500">{step.index}</span></div>
 <div className="pointer-events-none absolute -right-16 top-1/4 h-[330px] w-[330px] rounded-full bg-[#dfff00]/10 blur-[80px]"/>
 <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
  {index===0?<div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-[#dfff00]/40 bg-[#dfff00]/5 shadow-[0_0_0_30px_rgba(223,255,0,.025),0_0_0_65px_rgba(223,255,0,.02)] sm:h-64 sm:w-64"><div className="absolute inset-7 rounded-full border border-dashed border-[#dfff00]/40"/><MapPinned size={48} className="text-[#dfff00]"/></div>:index===1?<div className="w-full max-w-[350px] -rotate-3 rounded-[28px] border border-white/30 bg-black p-3 shadow-[0_30px_80px_rgba(0,0,0,.6)]"><div className="flex aspect-[16/10] flex-col justify-between rounded-[18px] bg-[#dfff00] p-7 text-black"><ScanLine size={24}/><span className="text-4xl font-black leading-none tracking-[-.07em] sm:text-5xl">MORE<br/>TO SEE.</span><span className="text-[9px] font-bold tracking-[.2em]">OORO / CREATIVE PREVIEW</span></div></div>:<div className="w-full max-w-[350px] space-y-3 rounded-[22px] border border-white/15 bg-white/[.07] p-6 backdrop-blur-xl"><div className="flex items-center justify-between"><span className="text-xs text-neutral-400">Playback reporting</span><ScanLine size={18} className="text-[#dfff00]"/></div>{[72,92,56,81,64,100,76].map((height,i)=><span key={i} className="mr-2 inline-block w-[9%] rounded-t-md bg-[#dfff00]/80" style={{height:height*.95}}/>)}<p className="text-xs text-neutral-400">Illustrative dashboard, not live campaign data.</p></div>}
 </div>
 <div className="relative z-10 border-t border-white/10 pt-4"><p className="text-[10px] font-semibold tracking-[.2em] text-neutral-500">{step.eyebrow}</p><p className="mt-1 text-2xl font-semibold tracking-[-.05em] sm:text-3xl">{step.word}</p></div>
 </motion.article>;
}
export function ImmersiveShowcase(){
 const reduced=useReducedMotion(); const ref=useRef<HTMLElement>(null);
 const {scrollYProgress}=useScroll({target:ref,offset:["start start","end end"]});
 const spring=useSpring(scrollYProgress,{stiffness:75,damping:25,mass:.4});
 const progress=useTransform(spring,[0,1],["0%","100%"]);
 const current=useTransform(spring,[0,.33,.67,1],[1,1,2,3]);
 return <section ref={ref} id="experience" className="relative bg-[#f6f6f2] text-[#101010]">
 <div className="container-ooro py-20 sm:py-28"><div className="max-w-3xl"><p className="text-[11px] font-semibold tracking-[.2em] text-neutral-500">THE OORO EXPERIENCE</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.065em] sm:text-6xl">From a place on the map<br/><span className="text-neutral-500">to a moment that matters.</span></h2></div></div>
 <div className={reduced?"container-ooro grid gap-7 pb-20 lg:grid-cols-2":"relative h-[245vh]"}><div className={reduced?"space-y-8":"sticky top-0 flex h-screen items-center overflow-hidden py-16"}>
 <div className="container-ooro grid w-full items-center gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
 <div className="order-2 lg:order-1"><p className="text-[11px] font-semibold tracking-[.18em] text-neutral-500">MOBILITY, MADE MEASURABLE</p><h3 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-[-.06em] sm:text-5xl">Plan. Play.<br/>Prove.</h3><p className="mt-6 max-w-sm text-base leading-8 text-neutral-600">OORO brings digital campaigns into real journeys. Create a brief, let the team confirm inventory, and get the playback data that is actually available.</p><Link href="/advertise" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold hover:underline">Explore campaign planning <ArrowUpRight size={17}/></Link>
 <div className="mt-10 hidden items-center gap-4 lg:flex"><span className="text-xs font-medium text-neutral-500">SCROLL TO EXPLORE</span><ChevronDown size={16} className="text-neutral-500"/></div></div>
 <div className="order-1 lg:order-2"><div className="relative h-[370px] sm:h-[500px]">{slides.map((_,index)=><ShowcasePanel key={index} index={index} scrollYProgress={spring} reduced={reduced}/>)}</div></div>
 </div></div></div>
 {!reduced&&<div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-neutral-200"><motion.div style={{width:progress}} className="h-full bg-[#a3bf19]"/></div>}
 </section>;
}
