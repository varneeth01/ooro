import { ArrowDown, ArrowUpRight } from "lucide-react";
import { CinematicTypography } from "./CinematicTypography";
import { HeroCanvasLoader } from "./HeroCanvasLoader";
import { Navbar } from "@/components/marketing/navbar";
import Image from "next/image";
import { MagneticLink } from "./MagneticLink";

export function CinematicHero() {
  return <section className="cinematic-hero" aria-labelledby="cinematic-title">
    <Navbar />
    <HeroCanvasLoader />
    <div className="hero-image-fallback" aria-hidden="true"><Image src="/field/ooro-bengaluru-auto-01.webp" alt="" fill sizes="100vw" priority className="object-cover object-[52%_42%]" /></div>
    <div className="hero-shade" aria-hidden="true" />
    <div className="cinematic-container">
      <div className="hero-side-note"><span>Moving media</span><i /></div>
      <CinematicTypography />
      <div className="hero-bottom"><MagneticLink href="/advertise" className="cinematic-button">Plan a campaign <ArrowUpRight size={17} /></MagneticLink><span className="hero-bottom-note">Real journeys. Real field work.<br />Availability confirmed before booking.</span><a href="#attention" className="hero-scroll" aria-label="Scroll to discover OORO"><span>Scroll to explore</span><ArrowDown size={15} /></a></div>
    </div>
    <span className="hero-index" aria-hidden="true">01 <span>/</span> 05</span>
  </section>;
}
