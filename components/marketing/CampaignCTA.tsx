import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function CampaignCTA() {
  return <section id="plan" className="cinematic-section" aria-labelledby="cta-title"><div className="cinematic-wrap"><div className="campaign-cta" data-reveal>
    <div><p className="field-label !text-black/60">05 / YOUR NEXT MOVE</p><h2 id="cta-title">Put your brand<br />in motion.</h2><p>Explore a campaign in Bengaluru. OORO will confirm eligible inventory and details before booking.</p></div>
    <Link href="/advertise">Plan a campaign <ArrowUpRight size={18} /></Link>
  </div></div></section>;
}
