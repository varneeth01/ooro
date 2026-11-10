import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Play } from "lucide-react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { ExperienceExplorer, ReadingProgress } from "./experience-explorer";
import { FieldFilmButton } from "./field-film-button";
import "./calm-home.css";

const steps = [
  { number: "01", title: "Tell us your plan", description: "Choose your preferred areas, campaign dates and budget." },
  { number: "02", title: "Share the creative", description: "Upload an image or video for our team's review." },
  { number: "03", title: "Confirm and go live", description: "We confirm available inventory and the campaign details before booking." },
] as const;

export function CalmHome() {
  return (
    <main id="main-content" className="calm-site">
      <a href="#calm-hero-title" className="calm-skip">Skip to content</a>
      <Navbar />
      <ReadingProgress />

      <section className="calm-hero" aria-labelledby="calm-hero-title">
        <div className="calm-shell calm-hero-grid">
          <div className="calm-hero-copy">
            <div className="calm-kicker"><span className="calm-kicker-mark" /> OORO / BENGALURU</div>
            <h1 id="calm-hero-title">Your next customer could be in the <em>next auto.</em></h1>
            <p>Digital advertising inside everyday auto-rickshaw journeys. A new way for Bengaluru businesses to show up.</p>
            <div className="calm-hero-actions">
              <Link href="/advertise" className="calm-primary">Plan a campaign <ArrowUpRight size={18} aria-hidden="true" /></Link>
              <Link href="#campaign-process" className="calm-text-link">See how it works <ArrowDownRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="calm-hero-footnote"><CheckCircle2 size={16} aria-hidden="true" /> Availability confirmed before booking</div>
          </div>
          <figure className="calm-hero-media">
            <Image src="/field/ooro-bengaluru-auto-01.webp" alt="OORO field operations with an auto-rickshaw in Bengaluru" fill priority fetchPriority="high" sizes="(max-width: 799px) calc(100vw - 40px), 48vw" className="calm-cover" />
            <FieldFilmButton />
            <figcaption><span>01 / THE REAL WORLD</span><span>BENGALURU, INDIA</span></figcaption>
          </figure>
        </div>
        <div className="calm-hero-bottom"><div className="calm-shell"><span>Made for the journeys that already happen.</span><span>Explore the story <ArrowDownRight size={15} aria-hidden="true" /></span></div></div>
      </section>

      <section id="attention" className="calm-section calm-intro" aria-labelledby="calm-intro-title">
        <div className="calm-shell calm-intro-grid">
          <p className="calm-section-id">01 — THE IDEA</p>
          <div>
            <h2 id="calm-intro-title">The city is moving.<br /><span>So is attention.</span></h2>
            <p className="calm-lead">Your customers don&apos;t spend their entire day on a screen at home. They commute, they explore, they cross neighborhoods. OORO brings brands into those real journeys.</p>
          </div>
        </div>
      </section>

      <section id="reality" className="calm-section calm-field" aria-labelledby="calm-field-title">
        <div className="calm-shell">
          <div className="calm-section-heading">
            <div><p className="calm-section-id">02 — ON THE GROUND</p><h2 id="calm-field-title">Built on real streets.<br /><span>Not in a render.</span></h2></div>
            <p className="calm-section-aside">Meet the work behind the screens: our people, Bengaluru autos, and the everyday effort of building OORO.</p>
          </div>
          <div className="calm-field-grid">
            <figure className="calm-field-photo">
              <Image src="/field/ooro-bengaluru-auto-02.webp" alt="People from OORO's field operations beside a Bengaluru auto-rickshaw" fill sizes="(max-width: 799px) 100vw, 55vw" className="calm-cover" />
              <figcaption>REAL FIELD WORK <span>— BENGALURU</span></figcaption>
            </figure>
            <div className="calm-field-video">
              <video controls playsInline preload="none" poster="/field/ooro-bengaluru-auto-01.webp" aria-label="Original OORO field installation footage">
                <source src="/field/ooro-installation-01.mp4" type="video/mp4" />
                Your browser does not support video playback.
              </video>
              <div className="calm-video-caption"><span><Play size={14} aria-hidden="true" /> The making of OORO</span><span>Original footage / Play on demand</span></div>
            </div>
          </div>
          <p className="calm-caption">These photos and footage document OORO field operations. Campaign availability is confirmed separately.</p>
        </div>
      </section>

      <ExperienceExplorer />

      <section id="campaign-process" className="calm-section calm-process" aria-labelledby="calm-process-title">
        <div className="calm-shell calm-process-grid">
          <div className="calm-process-intro">
            <p className="calm-section-id">04 — HOW IT WORKS</p>
            <h2 id="calm-process-title">Start simple.<br /><span>Move with purpose.</span></h2>
            <p>One clear path from an idea to a reviewed campaign. No inflated reach promises or complicated setup.</p>
          </div>
          <div className="calm-process-steps">
            {steps.map((step) => <article key={step.number}><span className="calm-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></article>)}
          </div>
        </div>
      </section>

      <section id="plan" className="calm-end" aria-labelledby="calm-end-title">
        <div className="calm-shell calm-end-grid">
          <div><p className="calm-section-id">YOUR NEXT MOVE</p><h2 id="calm-end-title">Make your brand<br /><em>part of the journey.</em></h2><p>Explore advertising in Bengaluru. We&apos;ll confirm eligible inventory and details before booking.</p></div>
          <Link href="/advertise" className="calm-end-button">Plan a campaign <ArrowUpRight size={20} aria-hidden="true" /></Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
