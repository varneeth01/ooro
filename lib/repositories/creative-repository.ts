import { readLocal, writeLocal } from "./storage";
import type { Creative } from "./types";

const key = "ooro.creatives";
export const creativeRepository = {
  list: () => readLocal<Creative[]>(key, []),
  save: (creative: Creative) => { const next = [...readLocal<Creative[]>(key, []).filter(item => item.id !== creative.id), creative]; writeLocal(key, next); return creative; },
};
