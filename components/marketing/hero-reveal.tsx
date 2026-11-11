"use client";
import { motion, useReducedMotion } from "framer-motion";
const variants={hidden:{opacity:0,y:30,clipPath:"inset(100% 0 0 0)"},show:{opacity:1,y:0,clipPath:"inset(0% 0 0 0)"}};
export function HeroReveal(){
 const reduced=useReducedMotion();
 return <h1 className="landing-display max-w-[760px] text-[clamp(3.4rem,7vw,6rem)] font-semibold leading-[.92] tracking-[-.04em]">
  {[["Your","brand"],["in the flow of"],["Bengaluru."]].map((line,i)=><span key={i} className="block overflow-hidden pb-[.06em]">{line.map((word,j)=><motion.span key={word+j} initial={reduced?false:"hidden"} animate="show" variants={variants} transition={{duration:.85,delay:reduced?0:.08+i*.14+j*.08,ease:[.16,1,.3,1]}} className={`mr-[.18em] inline-block last:mr-0 ${i===2?"text-[#dfff00]":""}`}>{word}</motion.span>)}</span>)}
 </h1>;
}
