"use client";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

export function HeroProduct() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, reduce ? 0 : 8]);
  return <motion.div style={{ y: imageY }} className="relative min-h-[500px] overflow-hidden border border-white/[.12] bg-[#111413] shadow-[0_36px_90px_rgba(0,0,0,.34)] sm:min-h-[610px]">
    <Image src="/ooro-mark-3d.png" alt="" aria-hidden="true" width={1254} height={1254} priority className="pointer-events-none absolute -right-20 -top-20 w-[520px] max-w-none opacity-55 sm:-right-24 sm:-top-32 sm:w-[680px]"/>
    <div className="absolute inset-x-5 bottom-5 top-28 overflow-hidden border border-white/15 bg-black sm:inset-x-8 sm:bottom-8 sm:top-36"><Image src="/ooro-auto-screen.svg" alt="OORO digital advertising screen concept mounted inside an auto" fill priority sizes="(max-width: 1024px) 100vw, 52vw" className="object-cover"/></div>
    <div className="absolute left-5 top-5 max-w-[190px] border border-white/10 bg-[#080a09]/90 px-3 py-2 text-[10px] font-semibold tracking-[.13em] text-white sm:left-8 sm:top-8">OORO MOBILITY MEDIA<br/><span className="font-normal tracking-[.08em] text-neutral-300">BENGALURU · CONCEPT VIEW</span></div>
    <div className="ooro-route-sweep pointer-events-none absolute bottom-5 top-28 w-px bg-[#dfff00]/80 sm:bottom-8 sm:top-36"/>
    <div className="absolute bottom-5 right-5 max-w-[calc(100%_-_2.5rem)] border border-white/15 bg-black/90 px-4 py-3 text-white sm:bottom-8 sm:right-8"><p className="text-[10px] tracking-[.12em] text-neutral-300">SCREEN PLACEMENT</p><p className="mt-2 text-sm font-semibold">Inside the passenger journey</p><p className="mt-1 text-[10px] text-neutral-300">Illustrative product view</p></div>
  </motion.div>;
}
