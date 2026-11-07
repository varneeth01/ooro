"use client";

import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { HeroScene } from "./HeroScene";
import { getExperienceQuality } from "./QualityManager";

class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function HeroCanvas() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    if (getExperienceQuality() === "static") return;
    const observer = new IntersectionObserver(([entry]) => setEnabled(entry.isIntersecting), { rootMargin: "160px" });
    observer.observe(element);
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth - .5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - .5) * -2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("pointermove", onMove); };
  }, []);

  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".cinematic-hero");
    if (!section) return;
    const update = () => { progress.current = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / Math.max(1, section.offsetHeight))); };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <div ref={root} className="hero-canvas" aria-hidden="true">
    {!failed && enabled && <CanvasBoundary onError={() => setFailed(true)}><Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 7.4], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power", stencil: false, depth: true }} onCreated={({ gl }) => {
      gl.setClearColor("#050505", 0);
      const canvas = gl.domElement;
      canvas.addEventListener("webglcontextlost", (event) => { event.preventDefault(); setFailed(true); }, { once: true });
    }}><Suspense fallback={null}><HeroScene progress={progress} pointer={pointer} /></Suspense></Canvas></CanvasBoundary>}
  </div>;
}
