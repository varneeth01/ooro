import { Footer } from "./footer";
import { CinematicHero } from "@/components/experience/CinematicHero";
import { ScrollController } from "@/components/experience/ScrollController";
import { CampaignJourney } from "./CampaignJourney";
import { InstallationStory } from "./InstallationStory";
import { AdvertiserBenefits } from "./AdvertiserBenefits";
import { CampaignCTA } from "./CampaignCTA";
import { CampaignPlanning } from "./CampaignPlanning";
import "@/components/experience/cinematic.css";

export function CinematicHome() {
  return <main id="main-content" className="cinematic-site bg-[#050505] text-[#f3f3ef]">
    <a href="#attention" className="sr-only fixed left-4 top-4 z-[100] bg-[#dfff00] px-4 py-3 text-black focus:not-sr-only">Skip to content</a>
    <ScrollController />
    <CinematicHero />
    <CampaignJourney />
    <InstallationStory />
    <CampaignPlanning />
    <AdvertiserBenefits />
    <CampaignCTA />
    <Footer />
  </main>;
}
