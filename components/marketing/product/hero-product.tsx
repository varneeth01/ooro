"use client";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { StatusDot } from "./status-dot";

export function HeroProduct() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, reduce ? 0 : 8]);
  return <motion.div style={{ y: imageY }} className="relative overflow-hidden border border-white/15 bg-[#141414] shadow-[0_30px_80px_rgba(0,0,0,.28)]"><Image src="/ooro-auto-screen.svg" alt="OORO digital advertising display mounted inside an auto" width={1200} height={900} priority sizes="(max-width: 1024px) 100vw, 55vw" className="h-auto w-full object-cover transition-transform duration-700 hover:scale-[1.018]"/><div className="absolute left-4 top-4 rounded-[8px] border border-white/15 bg-black/60 px-3 py-2 text-[10px] text-white backdrop-blur-xl sm:left-6 sm:top-6"><StatusDot label="OORO NETWORK"/></div><div className="absolute bottom-4 right-4 w-48 border border-white/15 bg-black/60 p-3 text-white backdrop-blur-xl sm:bottom-6 sm:right-6"><div className="flex items-center justify-between text-[9px] tracking-[.12em] text-neutral-400"><span>NETWORK PREVIEW</span><span>LIVE PLAN</span></div><div className="mt-4 text-xs font-medium">CAMPAIGN / TIRUPATI</div><div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400"><span>Auto display</span><StatusDot label="Connected"/></div></div></motion.div>;
}
