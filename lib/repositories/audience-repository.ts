import { readLocal, writeLocal } from "./storage";
import type { Audience } from "./types";

const key = "ooro.audiences";
export const audienceRepository = {
  list: () => readLocal<Audience[]>(key, []),
  save: (audience: Audience) => { const next = [...readLocal<Audience[]>(key, []).filter(item => item.id !== audience.id), audience]; writeLocal(key, next); return audience; },
};
