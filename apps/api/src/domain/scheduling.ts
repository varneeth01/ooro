import { z } from 'zod'

export const priorities = { HOUSE: 0, LOW: 50, NORMAL: 100, HIGH: 200, PREMIUM: 300, EMERGENCY: 1000 } as const
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
export const scheduleRules = z.object({
  days: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  windows: z.array(z.object({ start: clock, end: clock }).refine(w => w.start < w.end, 'Windows must end after start; split overnight windows at midnight')).max(12),
  mode: z.enum(['WEIGHTED', 'SEQUENCE', 'EVERY_MINUTES', 'PLAYS_PER_HOUR', 'PLAYS_PER_DAY', 'SHARE']),
  value: z.number().int().min(1).max(1440),
  creativeIds: z.array(z.string().uuid()).min(1).max(100),
  imageDurationSeconds: z.number().int().min(1).max(120).default(10),
}).superRefine((r, ctx) => {
  const windows = [...r.windows].sort((a,b) => a.start.localeCompare(b.start))
  if (windows.some((w,i) => i > 0 && windows[i-1].end > w.start)) ctx.addIssue({ code: 'custom', message: 'Daily windows overlap' })
  if ((r.mode === 'SHARE' && r.value > 100) || (r.mode === 'WEIGHTED' && r.value > 28) || (r.mode === 'PLAYS_PER_HOUR' && r.value > 120)) ctx.addIssue({ code: 'custom', message: 'Frequency exceeds supported capacity' })
})
export const scheduleInput = z.object({
  campaignId: z.string().uuid(), revision: z.number().int().nonnegative().default(0),
  startsAt: z.coerce.date(), endsAt: z.coerce.date(), timezone: z.literal('Asia/Kolkata').default('Asia/Kolkata'),
  priority: z.enum(['HOUSE','LOW','NORMAL','HIGH','PREMIUM','EMERGENCY']), exclusive: z.boolean().default(false),
  rules: scheduleRules,
  target: z.object({ screenIds: z.array(z.string().uuid()).max(1000).default([]), groupIds: z.array(z.string().uuid()).max(100).default([]), vehicleIds: z.array(z.string().uuid()).max(1000).default([]), routeId: z.string().uuid().optional(), depotId: z.string().uuid().optional(), city: z.string().max(120).optional(), area: z.string().max(120).optional(), vehicleType: z.string().max(40).optional(), tags: z.array(z.string().max(60)).max(20).default([]), all: z.boolean().default(false), geofence: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radiusKm: z.number().positive().max(500) }).optional() }),
  overrideReason: z.string().trim().min(10).max(1000).optional(),
}).refine(x => x.endsAt > x.startsAt && x.endsAt.getTime()-x.startsAt.getTime() <= 93*86400000, 'Schedule must span at most 93 days with end after start')
export type ScheduleRules = z.infer<typeof scheduleRules>
export type ScheduleInput = z.infer<typeof scheduleInput>
export function activeAt(start: Date, end: Date, rules: ScheduleRules, now: Date) {
  if (now < start || now >= end) return false
  const local = new Date(now.getTime() + 330 * 60000)
  if (!rules.days.includes(local.getUTCDay() || 7)) return false
  const time = local.toISOString().slice(11,16)
  return !rules.windows.length || rules.windows.some(w => time >= w.start && time < w.end)
}
export function rulesOverlap(a: ScheduleRules, b: ScheduleRules) {
  return a.days.some(d => b.days.includes(d)) && (!a.windows.length || !b.windows.length || a.windows.some(x => b.windows.some(y => x.start < y.end && y.start < x.end)))
}
export function distanceKm(a: number, b: number, c: number, d: number) {
  const r = (x: number) => x * Math.PI / 180
  const h = Math.sin(r(c-a)/2)**2 + Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1,h)))
}
// Fixed rates are paced across wall-clock buckets, not randomly selected.
export function intervalSeconds(r: ScheduleRules) {
  return r.mode === 'EVERY_MINUTES' ? r.value * 60 : r.mode === 'PLAYS_PER_HOUR' ? 3600/r.value : r.mode === 'PLAYS_PER_DAY' ? 86400/r.value : 0
}
export function requiredSlots(r: ScheduleRules, seconds: number, capacity: number) {
  if (r.mode === 'SHARE') return Math.ceil(capacity*r.value/100)
  const interval = intervalSeconds(r)
  return interval ? Math.max(1, Math.ceil(capacity*seconds/interval)) : r.mode === 'WEIGHTED' ? r.value : 1
}
