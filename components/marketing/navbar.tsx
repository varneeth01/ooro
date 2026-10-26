"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "../brand";

const links=[["Experience","/#experience"],["Why OORO","/#features"],["Solutions","/#solutions"],["Bengaluru","/coverage"]] as const;
export function Navbar(){
 const [open,setOpen]=useState(false);const [scrolled,setScrolled]=useState(false);const [hovered,setHovered]=useState<string|null>(null);const reduced=useReducedMotion();const pathname=usePathname();
 useEffect(()=>{const change=()=>setScrolled(window.scrollY>34);change();window.addEventListener("scroll",change,{passive:true});return()=>window.removeEventListener("scroll",change)},[]);
 useEffect(()=>{setOpen(false)},[pathname]);
 return <header id="top" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
  <motion.div layout={!reduced} transition={{type:"spring",stiffness:280,damping:30}} className={`mx-auto flex max-w-6xl items-center justify-between rounded-[22px] border border-white/[.12] bg-[#121416]/[.83] px-4 text-white shadow-[0_18px_55px_rgba(0,0,0,.25)] backdrop-blur-2xl transition-[padding,background-color] duration-300 sm:px-6 ${scrolled?"py-1":"py-2"}`}>
   <Brand dark/>
   <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex" onMouseLeave={()=>setHovered(null)}>
    {links.map(([label,href])=><Link key={href} href={href} onMouseEnter={()=>setHovered(href)} className="relative rounded-full px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">{hovered===href&&<motion.span layoutId="nav-pill" transition={{type:"spring",stiffness:390,damping:32}} className="absolute inset-0 -z-10 rounded-full bg-white/10"/>}{label}</Link>)}
   </nav>
   <div className="hidden items-center gap-3 lg:flex"><Link href="/login" className="rounded-full px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition hover:text-white">Log in</Link><Link href="/advertise" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-[#dfff00]">Plan a campaign <ArrowUpRight size={15}/></Link></div>
   <button type="button" aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open} aria-controls="ooro-mobile-nav" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white lg:hidden" onClick={()=>setOpen(v=>!v)}>{open?<X size={21}/>:<Menu size={21}/>}</button>
  </motion.div>
  <AnimatePresence initial={false}>{open&&<motion.nav id="ooro-mobile-nav" aria-label="Mobile navigation" initial={reduced?false:{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}} transition={{duration:.22}} className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-[22px] border border-white/15 bg-[#121416]/95 p-3 text-white shadow-2xl backdrop-blur-2xl lg:hidden">
    {links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-white/10">{label}</Link>)}<div className="mt-2 flex gap-2 border-t border-white/10 p-2 pt-4"><Link onClick={()=>setOpen(false)} href="/login" className="flex-1 rounded-full border border-white/20 px-4 py-3 text-center text-sm">Log in</Link><Link onClick={()=>setOpen(false)} href="/advertise" className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-black">Plan campaign</Link></div>
   </motion.nav>}</AnimatePresence>
 </header>;
}
