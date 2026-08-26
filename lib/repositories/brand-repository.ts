import { readLocal, writeLocal } from "./storage";
import type { Brand } from "./types";

const key = "ooro.brands";
const seed: Brand[] = [{ id: "brand-demo", name: "Demo brand", website: "", industry: "Food & beverage", market: "Bengaluru", description: "A local demo workspace brand." }];
export const brandRepository = {
  list: () => readLocal<Brand[]>(key, seed),
  save: (brand: Brand) => { const next = [...readLocal<Brand[]>(key, seed).filter(item => item.id !== brand.id), brand]; writeLocal(key, next); return brand; },
};
