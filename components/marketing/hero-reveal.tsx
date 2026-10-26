"use client";
import { motion, useReducedMotion } from "framer-motion";
const variants={hidden:{opacity:0,y:22,filter:"blur(8px)"},show:{opacity:1,y:0,filter:"blur(0px)"}};
export function HeroReveal(){
 const reduced=useReducedMotion();
 return <h1 className="mt-7 max-w-[720px] text-[clamp(3.25rem,6vw,6.6rem)] font-semibold leading-[.98] tracking-[-.075em]">
  {[[ "Your","brand." ],["Everyday"],["in","motion."]].map((line,i)=><span key={i} className="block">{line.map((word,j)=><motion.span key={word+j} initial={reduced?false:"hidden"} animate="show" variants={variants} transition={{duration:.8,delay:reduced?0:.12+i*.17+j*.12,ease:[.22,1,.36,1]}} className={`mr-[.18em] inline-block last:mr-0 ${i===1?"bg-gradient-to-r from-[#dfff00] to-[#a9ca2c] bg-clip-text text-transparent":""}`}>{word}</motion.span>)}</span>)}
 </h1>;
}
