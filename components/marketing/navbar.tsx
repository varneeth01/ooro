"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "../brand";

const links=[["How it works","/how-it-works"],["Why OORO","/#features"],["Who it is for","/#solutions"],["Coverage","/coverage"]] as const;
export function Navbar(){
 const menuRef=useRef<HTMLButtonElement>(null);const [open,setOpen]=useState(false);const [scrolled,setScrolled]=useState(false);const [hovered,setHovered]=useState<string|null>(null);const reduced=useReducedMotion();const pathname=usePathname();
 useEffect(()=>{const change=()=>setScrolled(window.scrollY>34);change();window.addEventListener("scroll",change,{passive:true});return()=>window.removeEventListener("scroll",change)},[]);
 useEffect(()=>{setOpen(false)},[pathname]);
 useEffect(()=>{if(!open)return;const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setOpen(false);menuRef.current?.focus();}};window.addEventListener("keydown",onEscape);return()=>window.removeEventListener("keydown",onEscape);},[open]);
 return <header id="top" className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090b0b]/90 text-white backdrop-blur-xl">
  <motion.div layout={!reduced} transition={{type:"spring",stiffness:280,damping:30}} className={`container-ooro flex items-center justify-between transition-[padding] duration-300 ${scrolled?"py-1":"py-2"}`}>
   <Brand dark/>
   <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex" onMouseLeave={()=>setHovered(null)}>
    {links.map(([label,href])=><Link key={href} href={href} onMouseEnter={()=>setHovered(href)} className="relative isolate rounded-full px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">{hovered===href&&<motion.span layoutId="nav-pill" transition={{type:"spring",stiffness:390,damping:32}} className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-white/15"/>}{label}</Link>)}
   </nav>
   <div className="hidden items-center gap-3 lg:flex"><Link href="/login" className="px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#dfff00]">Log in</Link><Link href="/advertise" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#dfff00] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">Plan a campaign <ArrowUpRight size={15}/></Link></div>
   <button ref={menuRef} type="button" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="ooro-mobile-nav" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 text-white lg:hidden" onClick={()=>setOpen(v=>!v)}>{open?<X size={21}/>:<Menu size={21}/>}</button>
  </motion.div>
  <AnimatePresence initial={false}>{open&&<motion.nav id="ooro-mobile-nav" aria-label="Mobile navigation" initial={reduced?false:{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.2}} className="border-t border-white/10 bg-[#0c0f0e] px-5 py-4 text-white shadow-2xl lg:hidden">
    {links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="block min-h-12 border-b border-white/10 px-1 py-3 text-base font-medium hover:text-[#dfff00] focus-visible:outline-2 focus-visible:outline-[#dfff00]">{label}</Link>)}<div className="mt-4 grid grid-cols-2 gap-3"><Link onClick={()=>setOpen(false)} href="/login" className="rounded-xl border border-white/20 px-4 py-3 text-center text-base">Log in</Link><Link onClick={()=>setOpen(false)} href="/advertise" className="rounded-xl bg-[#dfff00] px-4 py-3 text-center text-base font-semibold text-black">Plan campaign</Link></div>
   </motion.nav>}</AnimatePresence>
 </header>;
}
