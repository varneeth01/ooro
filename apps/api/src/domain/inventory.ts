export const DEFAULT_TOTAL_SLOTS = 28;
export const INVENTORY_STATUSES = ["AVAILABLE", "HELD", "RESERVED", "ACTIVE", "BLOCKED"] as const;

export function dateKeys(start: Date, end: Date) { const result: string[] = []; const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())); const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())); while (cursor <= last) { result.push(cursor.toISOString().slice(0, 10)); cursor.setUTCDate(cursor.getUTCDate() + 1); } return result; }
export function slotCandidates(totalSlots: number, premiumSlots: number, tier: "STANDARD" | "PREMIUM_PLUS") { const all = Array.from({ length: Math.max(0, totalSlots) }, (_, slot) => slot); if (tier === "PREMIUM_PLUS") return [...all.slice(0, Math.max(0, premiumSlots)), ...all.slice(Math.max(0, premiumSlots))]; return [...all.slice(Math.max(0, premiumSlots)), ...all.slice(0, Math.max(0, premiumSlots))]; }
export function slotFillRate(paidSlotDays: number, commercialSlotCapacity: number) { return commercialSlotCapacity > 0 ? paidSlotDays / commercialSlotCapacity : 0; }
