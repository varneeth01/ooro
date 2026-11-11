"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import "./experience-explorer.css";

const chapters = [
  {
    id: "passengers",
    eyebrow: "01 / THE MOMENT",
    tab: "Passengers",
    title: "A moment outside the feed.",
    description: "The commute is already happening. OORO brings a new kind of brand presence into that everyday journey, through passenger-facing screens in autos.",
    detail: "An attention space shaped by real journeys.",
  },
  {
    id: "businesses",
    eyebrow: "02 / THE OPPORTUNITY",
    tab: "Businesses",
    title: "Get noticed beyond the usual scroll.",
    description: "Start with the Bengaluru areas, creative and budget that matter to your business. Our team verifies eligible inventory before a campaign is booked.",
    detail: "A clearer way to explore advertising.",
  },
  {
    id: "operations",
    eyebrow: "03 / THE PEOPLE",
    tab: "Behind OORO",
    title: "Technology meets the street.",
    description: "Behind every campaign is real field work: preparing the screens, reviewing creative and coordinating the details of a real-world rollout.",
    detail: "Built by people, not presentation slides.",
  },
] as const;

export function ExperienceExplorer() {
  const [active, setActive] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const chapter = chapters[active];

  const select = useCallback((next: number, focus = false) => {
    const index = (next + chapters.length) % chapters.length;
    setActive(index);
    if (focus) requestAnimationFrame(() => tabs.current[index]?.focus());
  }, []);

  return (
    <section className="ooro-explore" id="features" aria-labelledby="ooro-explore-title">
      <div className="calm-shell">
        <div className="ooro-explore-heading">
          <div>
            <p className="calm-section-id">03 — EXPLORE OORO</p>
            <h2 id="ooro-explore-title">One city.<br /><span>Different perspectives.</span></h2>
          </div>
          <p>Explore what OORO means for passengers, local businesses and the people making it happen.</p>
        </div>
        <div className="ooro-explore-tabs" role="tablist" aria-label="Explore OORO perspectives">
          {chapters.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => { tabs.current[index] = element; }}
              id={`ooro-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={active === index}
              aria-controls="ooro-explore-panel"
              tabIndex={active === index ? 0 : -1}
              className={active === index ? "is-active" : ""}
              onClick={() => select(index)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") { event.preventDefault(); select(active + 1, true); }
                else if (event.key === "ArrowLeft") { event.preventDefault(); select(active - 1, true); }
                else if (event.key === "Home") { event.preventDefault(); select(0, true); }
                else if (event.key === "End") { event.preventDefault(); select(chapters.length - 1, true); }
              }}
            >
              <span>0{index + 1}</span> {item.tab}
            </button>
          ))}
        </div>
        <div className="ooro-explore-panel" id="ooro-explore-panel" role="tabpanel" aria-labelledby={`ooro-tab-${chapter.id}`} key={chapter.id} tabIndex={0}>
          <div className="ooro-explore-media">
            <div className={`ooro-chapter-visual ooro-chapter-${chapter.id}`} role="img" aria-label={`Editorial illustration representing ${chapter.tab.toLowerCase()} in OORO's advertising network`}>
              <span className="ooro-visual-topline">OORO / REAL-WORLD MEDIA</span>
              <span className="ooro-visual-arc" aria-hidden="true" />
              <span className="ooro-visual-center" aria-hidden="true">{active === 0 ? "JOURNEY" : active === 1 ? "BRAND" : "BUILD"}</span>
              <span className="ooro-visual-number" aria-hidden="true">0{active + 1}</span>
              <span className="ooro-visual-bottomline">BENGALURU / INDIA</span>
            </div>
          </div>
          <div className="ooro-explore-content">
            <p className="ooro-explore-eyebrow">{chapter.eyebrow}</p>
            <h3>{chapter.title}</h3>
            <p>{chapter.description}</p>
            <div className="ooro-explore-bottom">
              <span>{chapter.detail}</span>
              <div className="ooro-explore-arrows">
                <button type="button" aria-label="Previous perspective" onClick={() => select(active - 1)}><ChevronLeft size={19} /></button>
                <button type="button" aria-label="Next perspective" onClick={() => select(active + 1)}><ChevronRight size={19} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReadingProgress() {
  const progressBar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame = 0;
    const calculate = () => {
      frame = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      progressBar.current?.style.setProperty("transform", `scaleX(${progress / 100})`);
    };
    const update = () => { if (!frame) frame = requestAnimationFrame(calculate); };
    calculate();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return <div className="ooro-reading-progress" aria-hidden="true"><span ref={progressBar} /></div>;
}
