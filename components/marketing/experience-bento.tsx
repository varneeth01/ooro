"use client";
import { useRef, type PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Clapperboard, Route, ShieldCheck, ArrowUpRight } from "lucide-react";
import Link from "next/link";
const items=[
 {eyebrow:"01 / SMART TARGETING",title:"Bengaluru, your way.",copy:"Choose neighborhoods, areas, and campaign dates. OORO checks eligible inventory before confirmation.",Icon:MapPin,span:"lg:col-span-2",large:true},
 {eyebrow:"02 / REAL-WORLD MEDIA",title:"Made to move.",copy:"Screens inside autos and cabs, not another ad lost in a feed.",Icon:Route,span:"",large:false},
 {eyebrow:"03 / CREATIVE CONTROL",title:"Your story, on screen.",copy:"Bring an image or video. Our team reviews the creative before scheduling.",Icon:Clapperboard,span:"",large:false},
 {eyebrow:"04 / DELIVERY EVIDENCE",title:"Know what played.",copy:"Review supported proof-of-play events and available campaign reports instead of confusing estimates with verified plays.",Icon:ShieldCheck,span:"lg:col-span-2",large:true},
];
export function ExperienceBento(){
 const reduced=useReducedMotion();
 return <section id="features" className="bg-[#090b0c] py-20 text-white sm:py-32"><div className="container-ooro">
 <div className="mb-10 flex flex-wrap items-end justify-between gap-6"><div><p className="text-[11px] font-semibold tracking-[.2em] text-[#dfff00]">MORE THAN A SCREEN</p><h2 className="mt-4 max-w-[780px] text-4xl font-semibold leading-[1.04] tracking-[-.07em] sm:text-6xl">A smarter way to be seen <span className="text-neutral-500">in the real world.</span></h2></div><Link href="/how-it-works" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-200 hover:text-white">How OORO works <ArrowUpRight size={17}/></Link></div>
 <div className="grid gap-4 lg:grid-cols-3">{items.map(({eyebrow,title,copy,Icon,span,large},i)=><SpotlightCard key={eyebrow} reduced={!!reduced} index={i} span={span} large={large} eyebrow={eyebrow} title={title} copy={copy} Icon={Icon}/>)}</div>
 </div></section>;
}
function SpotlightCard({reduced,index,span,large,eyebrow,title,copy,Icon}:{reduced:boolean;index:number;span:string;large:boolean;eyebrow:string;title:string;copy:string;Icon:typeof MapPin}){
 const ref=useRef<HTMLElement>(null);
 function pointer(event:PointerEvent<HTMLElement>){const node=ref.current;if(!node)return;const b=node.getBoundingClientRect();node.style.setProperty("--mx",event.clientX-b.left+"px");node.style.setProperty("--my",event.clientY-b.top+"px");}
 return <motion.article ref={ref} onPointerMove={pointer} initial={reduced?false:{opacity:0,y:20}} whileInView={reduced?undefined:{opacity:1,y:0}} viewport={{once:true,margin:"-60px"}} transition={{duration:.65,delay:index*.08,ease:[.22,1,.36,1]}} whileHover={reduced?undefined:{y:-5}} className={`group relative isolate flex min-h-[330px] flex-col overflow-hidden rounded-[26px] border border-white/[.11] bg-[#17191b] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] sm:p-9 ${span}`}>
 <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{background:"radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(223,255,0,.13), transparent 65%)"}}/>
 <div className="relative z-10 flex items-start justify-between gap-4"><p className="text-[10px] font-semibold tracking-[.18em] text-neutral-500">{eyebrow}</p><span className="rounded-[14px] border border-white/10 bg-white/5 p-3"><Icon size={21} className="text-[#dfff00]"/></span></div>
 {large&&<div className="pointer-events-none absolute -right-8 bottom-1/4 text-[125px] font-black tracking-[-.1em] text-white/[.025] sm:text-[190px]">{index===0?"BLR":"OORO"}</div>}
 <div className="relative z-10 mt-auto pt-16"><h3 className="max-w-md text-2xl font-semibold tracking-[-.055em] sm:text-3xl">{title}</h3><p className="mt-4 max-w-[450px] text-sm leading-7 text-neutral-400">{copy}</p></div>
 </motion.article>;
}
