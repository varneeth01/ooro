"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function ScrollController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.fromTo(element, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: "power2.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
      });
      gsap.to(".journey-line", { scaleX: 1, transformOrigin: "left center", ease: "none", scrollTrigger: { trigger: ".route-graphic", start: "top 85%", end: "bottom 15%", scrub: .7 } });
    });
    return () => context.revert();
  }, []);
  return null;
}
