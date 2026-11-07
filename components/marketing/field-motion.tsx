"use client";

import { useEffect } from "react";

/**
 * Progressive enhancement only: sections remain visible if JavaScript is
 * disabled or reduced motion is requested. No scroll listeners or timers.
 */
export function FieldMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".field-site");
    if (!root || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>(".field-section"));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("field-is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.05, rootMargin: "0px 0px -30px 0px" });
    for (const section of sections) observer.observe(section);
    root.classList.add("field-motion-ready");
    return () => { observer.disconnect(); root.classList.remove("field-motion-ready"); };
  }, []);
  return null;
}
