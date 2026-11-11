import Image from "next/image";
import { Play } from "lucide-react";

export function InstallationStory() {
  return <section id="reality" className="cinematic-section alt" aria-labelledby="installation-title">
    <div className="cinematic-wrap">
      <div className="scene-heading" data-reveal>
        <span className="scene-no">03 / REALITY</span>
        <div><p className="field-label">Out in Bengaluru</p><h2 id="installation-title">Built in the street.<br /><span>Seen in the real world.</span></h2><p className="mt-6">A look at the people, autos and field work behind OORO. These are original moments from our Bengaluru rollout.</p></div>
      </div>
      <div className="install-grid">
        <figure className="install-large" data-reveal><Image src="/field/ooro-bengaluru-auto-01.webp" alt="OORO team member with an auto driver beside a Bengaluru auto-rickshaw" fill sizes="(max-width: 767px) 100vw, 58vw" priority={false} className="object-cover object-[50%_42%]" /><figcaption className="media-caption"><span>Field operations / Bengaluru</span><strong>People first. Every installation.</strong></figcaption></figure>
        <div className="install-side">
          <figure data-reveal><Image src="/field/ooro-bengaluru-auto-02.webp" alt="OORO on-ground team beside an auto-rickshaw in Bengaluru" fill sizes="(max-width: 767px) 50vw, 38vw" className="object-cover object-[50%_38%]" /><figcaption className="media-caption"><span>On the ground</span><strong>Real conversations.</strong></figcaption></figure>
          <div className="video-panel" data-reveal><video className="install-video" controls playsInline preload="none" poster="/field/ooro-bengaluru-auto-01.webp" aria-label="Original OORO installation footage"><source src="/field/ooro-installation-01.mp4" type="video/mp4" />Your browser does not support the video element.</video><p className="footnote"><Play size={13} className="mr-1 inline text-[#dfff00]" aria-hidden="true" /> Original installation footage. Playback starts only when selected.</p></div>
        </div>
      </div>
      <p className="footnote">Photos and footage document field operations. Campaign availability is confirmed before booking.</p>
    </div>
  </section>;
}
