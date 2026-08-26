import { readLocal, writeLocal } from "./storage";
import type { Quote } from "./types";

const key = "ooro.quotes";
export const quoteRepository = {
  list: () => readLocal<Quote[]>(key, []),
  save: (quote: Quote) => { const next = [...readLocal<Quote[]>(key, []).filter(item => item.id !== quote.id), quote]; writeLocal(key, next); return quote; },
};
