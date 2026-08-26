import { readLocal, writeLocal } from "./storage";
import type { CampaignDraft } from "./types";

const key = "ooro.campaigns";
export const campaignRepository = {
  list: () => readLocal<CampaignDraft[]>(key, []),
  save: (campaign: CampaignDraft) => { const next = [...readLocal<CampaignDraft[]>(key, []).filter(item => item.id !== campaign.id), campaign]; writeLocal(key, next); return campaign; },
};
