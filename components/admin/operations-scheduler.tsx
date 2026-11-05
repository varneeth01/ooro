"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Check, Plus, RefreshCw, X } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/app-ui";

type Named = { id: string; name: string };
type Rules = { days: number[]; windows: { start: string; end: string }[]; mode: string; value: number; creativeIds: string[]; imageDurationSeconds: number };
type Target = { screenIds: string[]; groupIds: string[]; vehicleIds: string[]; tags: string[]; all: boolean; city?: string; area?: string; vehicleType?: string; routeId?: string; depotId?: string; geofence?: { latitude: number; longitude: number; radiusKm: number } };
type Schedule = { id: string; campaignId: string; revision: number; startsAt: string; endsAt: string; priority: number; exclusive: boolean; rules: Rules; targeting: Target; campaign: { name: string; assignments: { displayId: string }[] } };
type Creative = Named & { status: string; type: string };
type Data = { schedules: Schedule[]; campaigns: (Named & { status: string; ownerEmail?: string; startsAt?: string; endsAt?: string; creatives: Creative[] })[]; screens: Named[]; groups: Named[]; routes: Named[]; depots: Named[]; vehicles: { id: string; registrationNumber: string }[] };
type Report = { eligibleScreens: number; offlineScreens: number; reservedSlotDays: number; canPublish: boolean; conflicts: { code: string; message: string; screenId?: string }[] };

const priorityNames: Record<number, string> = { 0: "HOUSE", 50: "LOW", 100: "NORMAL", 200: "HIGH", 300: "PREMIUM", 1000: "EMERGENCY" };
const local = (value: string) => new Date(new Date(value).getTime() + 330 * 60000).toISOString().slice(0, 16);
const today = () => local(new Date().toISOString()).slice(0, 10);
const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-neutral-100 sm:text-sm";
const buttonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-yellow)] px-4 text-sm font-semibold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const defaultRules = (): Rules => ({ days: [1, 2, 3, 4, 5, 6, 7], windows: [], mode: "WEIGHTED", value: 1, creativeIds: [], imageDurationSeconds: 10 });
const defaultTarget = (): Target => ({ screenIds: [], groupIds: [], vehicleIds: [], tags: [], all: false });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ranges = ["Day", "Week", "Month"] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm font-medium text-neutral-800"><span>{label}</span>{children}{hint && <span className="mt-1 block text-xs font-normal leading-5 text-neutral-500">{hint}</span>}</label>;
}

function rulesOverlap(a: Rules, b: Rules) {
  return a.days.some((day) => b.days.includes(day)) && (!a.windows.length || !b.windows.length || a.windows.some((x) => b.windows.some((y) => x.start < y.end && y.start < x.end)));
}

export function OperationsScheduler({ canOverrideInventory = false, initialCampaignId }: { canOverrideInventory?: boolean; initialCampaignId?: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [campaignId, setCampaign] = useState("");
  const [revision, setRevision] = useState(0);
  const [start, setStart] = useState(`${today()}T07:00`);
  const [end, setEnd] = useState(`${today()}T22:00`);
  const [rules, setRules] = useState<Rules>(defaultRules);
  const [target, setTarget] = useState<Target>(defaultTarget);
  const [priority, setPriority] = useState("NORMAL");
  const [exclusive, setExclusive] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState("");
  const [overrideReason, setReason] = useState("");
  const [view, setView] = useState<"plan" | "timeline">("plan");
  const [range, setRange] = useState<(typeof ranges)[number]>("Day");
  const [date, setDate] = useState(today());
  const [screen, setScreen] = useState("");
  const [initialSelectionApplied, setInitialSelectionApplied] = useState(false);
  const [step, setStep] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/scheduler", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${payload.error?.message ?? "Scheduler unavailable."}${payload.requestId ? ` Reference: ${payload.requestId}` : ""}`);
      setData(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Scheduler unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = data?.campaigns.find((campaign) => campaign.id === campaignId);
  const hasTarget = target.all || target.screenIds.length > 0 || target.groupIds.length > 0 || target.vehicleIds.length > 0 || !!(target.routeId || target.depotId || target.city?.trim() || target.area?.trim() || target.vehicleType?.trim() || target.tags.length || target.geofence);
  const hasFleetFilters = !!(target.routeId || target.depotId || target.city?.trim() || target.area?.trim() || target.vehicleType?.trim() || target.tags.length || target.geofence);
  const checkBlocker = !campaignId ? "Choose a campaign first." : !selected?.creatives.some((creative) => creative.status === "APPROVED") ? "This campaign has no approved creative. Upload and approve one before scheduling." : !start || !end || start >= end ? "Set a valid start and end time." : !rules.days.length ? "Choose at least one day of the week." : !rules.creativeIds.length ? "Add at least one approved creative to the playback sequence." : !hasTarget ? "Choose at least one screen or targeting filter." : null;
  const publishBlocker = !campaignId ? "Choose a campaign first." : !selected?.creatives.some((creative) => creative.status === "APPROVED") ? "This campaign has no approved creative. Upload and approve one before scheduling." : !rules.creativeIds.length ? "Add an approved creative to the playback sequence." : !report ? "Check availability before publishing." : !report.canPublish ? "Resolve the availability conflicts before publishing." : null;
  const payload = useMemo(() => ({ campaignId, revision, startsAt: `${start}:00+05:30`, endsAt: `${end}:00+05:30`, timezone: "Asia/Kolkata", priority, exclusive, rules, target, ...(overrideReason.trim() ? { overrideReason: overrideReason.trim() } : {}) }), [campaignId, revision, start, end, priority, exclusive, rules, target, overrideReason]);
  useEffect(() => { setReport(null); }, [payload]);

  async function submit(action: "check" | "publish") {
    if (checkBlocker) {
      setError(checkBlocker);
      return;
    }
    if (action === "publish" && !window.confirm("Publish this schedule and queue a manifest refresh for affected screens?")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/scheduler/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(`${result.error?.message ?? "Schedule request failed."}${result.requestId ? ` Reference: ${result.requestId}` : ""}`);
      setReport(result.data);
      if (action === "publish") {
        setRevision(result.data.schedule.revision);
        setMessage("Schedule published. Refresh commands are queued; offline screens sync when they reconnect.");
        await load();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Schedule request failed.");
    } finally {
      setBusy(false);
    }
  }

  function edit(schedule: Schedule) {
    setStep(1);
    setCampaign(schedule.campaignId);
    setRevision(schedule.revision);
    setStart(local(schedule.startsAt));
    setEnd(local(schedule.endsAt));
    setRules({ ...schedule.rules, days: [...schedule.rules.days], windows: [...schedule.rules.windows], creativeIds: [...schedule.rules.creativeIds] });
    setTarget({ ...schedule.targeting, screenIds: [...schedule.targeting.screenIds], groupIds: [...schedule.targeting.groupIds], vehicleIds: [...schedule.targeting.vehicleIds], tags: [...schedule.targeting.tags] });
    setPriority(priorityNames[schedule.priority] ?? "NORMAL");
    setExclusive(schedule.exclusive);
    setReason("");
    setReport(null);
    setMessage(`Editing schedule revision ${schedule.revision}.`);
    setError("");
    setView("plan");
  }

  function startNewSchedule() {
    setStep(1);
    setCampaign("");
    setRevision(0);
    setStart(`${today()}T07:00`);
    setEnd(`${today()}T22:00`);
    setRules(defaultRules());
    setTarget(defaultTarget());
    setPriority("NORMAL");
    setExclusive(false);
    setReport(null);
    setReason("");
    setMessage("");
    setError("");
    setView("plan");
  }

  useEffect(() => {
    if (!initialCampaignId || !data || initialSelectionApplied) return;
    const schedule = data.schedules.find((item) => item.campaignId === initialCampaignId);
    if (schedule) {
      edit(schedule);
    } else if (data.campaigns.some((item) => item.id === initialCampaignId)) {
      setCampaign(initialCampaignId);
      setView("plan");
      setMessage("Campaign selected. Configure delivery timing, playback and screens here, then check availability before publishing.");
    } else {
      setError("That campaign is not available in the scheduler. Refresh the page and try again.");
    }
    setInitialSelectionApplied(true);
  }, [data, edit, initialCampaignId, initialSelectionApplied]);

  function moveCreative(index: number, delta: number) {
    const next = [...rules.creativeIds];
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    setRules({ ...rules, creativeIds: next });
  }

  function toggleTarget(key: "screenIds" | "groupIds" | "vehicleIds", id: string, checked: boolean) {
    setTarget((current) => ({ ...current, [key]: checked ? [...current[key], id] : current[key].filter((item) => item !== id) }));
  }

  const days = range === "Month" ? 31 : range === "Week" ? 7 : 1;
  const from = new Date(`${date}T00:00:00+05:30`).getTime();
  const until = from + days * 86400000;
  const axisMiddle = new Date(from + (days / 2) * 86400000);
  const axisEnd = new Date(until - 86400000);
  const axisLabel = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(value);
  const axisLabels = days === 1 ? ["00:00", "12:00", "24:00"] : [axisLabel(new Date(from)), axisLabel(axisMiddle), axisLabel(axisEnd)];
  const visible = data?.schedules.filter((schedule) => new Date(schedule.startsAt).getTime() < until && new Date(schedule.endsAt).getTime() > from && (!screen || schedule.campaign.assignments.some((assignment) => assignment.displayId === screen))) ?? [];
  const hasExplicitTargets = target.screenIds.length + target.groupIds.length + target.vehicleIds.length > 0;
  const baseTargetSummary = target.all ? "All screens" : hasExplicitTargets ? `${target.screenIds.length} screens · ${target.groupIds.length} groups · ${target.vehicleIds.length} vehicles` : "No explicit screens, groups, or vehicles";
  const targetingFilters = [target.city && `City: ${target.city}`, target.area && `Area: ${target.area}`, target.vehicleType && `Vehicle: ${target.vehicleType}`, target.routeId && `Route: ${data?.routes.find((item) => item.id === target.routeId)?.name ?? "Selected route"}`, target.depotId && `Depot: ${data?.depots.find((item) => item.id === target.depotId)?.name ?? "Selected depot"}`, target.tags.length > 0 && `Tags: ${target.tags.join(", ")}`, target.geofence && `Within ${target.geofence.radiusKm} km`].filter(Boolean);
  const targetSummary = [baseTargetSummary, ...targetingFilters].join(" · ");

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader title="Scheduler" description="Plan a campaign’s screen, timing, and playback. Check availability before publishing." action={revision > 0 ? <button type="button" onClick={startNewSchedule} className={buttonClass}><Plus size={15} />New schedule</button> : undefined} />

    <nav aria-label="Scheduler views" className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4">
      <button type="button" aria-pressed={view === "plan"} onClick={() => setView("plan")} className={`min-h-10 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${view === "plan" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-200"}`}>{revision > 0 ? "Edit schedule" : "Plan delivery"}</button>
      <button type="button" aria-pressed={view === "timeline"} onClick={() => setView("timeline")} className={`min-h-10 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${view === "timeline" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-200"}`}>Timeline <span className={`ml-1 tabular-nums ${view === "timeline" ? "text-neutral-300" : "text-neutral-500"}`}>{loading ? "…" : data?.schedules.length ?? 0}</span></button>
    </nav>

    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p className="min-w-0 flex-1">{error}</p><button type="button" onClick={() => void load()} className="shrink-0 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">Retry</button></div>}
    {message && <p role="status" className="flex items-start gap-2 rounded-xl border border-[#d9e8a4] bg-[#f7fadf] p-3 text-sm text-neutral-800"><Check size={16} className="mt-0.5 shrink-0 text-[#53651a]" />{message}</p>}

    {loading && !data ? <div className="space-y-4" aria-label="Loading scheduler"><div className="h-28 animate-pulse rounded-xl bg-neutral-200" /><div className="h-72 animate-pulse rounded-xl bg-neutral-200" /></div> : !data ? <SectionCard title="Scheduler unavailable" description="The scheduler could not load campaign and screen data."><button type="button" onClick={() => void load()} className={buttonClass}><RefreshCw size={15} />Try again</button></SectionCard> : view === "timeline" ? <SectionCard title="Campaign date spans" description="Bars show campaign start and end dates. Weekdays and daily playback windows are listed for each campaign.">
      <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Timeline range">{ranges.map((item) => <button type="button" key={item} aria-pressed={range === item} onClick={() => setRange(item)} className={`${buttonClass} ${range === item ? "border-black bg-black text-white hover:bg-black" : ""}`}>{item}</button>)}<button type="button" onClick={() => { setDate(today()); setRange("Day"); }} className={buttonClass}>Today</button></div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <label className="text-xs font-medium text-neutral-600">Date<input aria-label="Timeline date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none focus:border-black focus:ring-2 focus:ring-black/10 sm:text-sm" /></label>
          <label className="text-xs font-medium text-neutral-600">Screen<select aria-label="Filter timeline by screen" value={screen} onChange={(event) => setScreen(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none focus:border-black focus:ring-2 focus:ring-black/10 sm:text-sm"><option value="">All screens</option>{data.screens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto"><div className="grid min-w-[620px] grid-cols-[180px_minmax(0,1fr)] gap-3 text-xs text-neutral-500"><span className="font-medium">{date} · IST</span><div className="flex justify-between border-b border-neutral-200 pb-2"><span>{axisLabels[0]}</span><span>{axisLabels[1]}</span><span>{axisLabels[2]}</span></div></div></div>
      {visible.length ? <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200"><div className="min-w-[620px]">
        {visible.map((schedule) => {
          const left = Math.max(0, ((new Date(schedule.startsAt).getTime() - from) / (until - from)) * 100);
          const width = Math.max(0, Math.min(100, ((new Date(schedule.endsAt).getTime() - from) / (until - from)) * 100) - left);
          const conflict = visible.some((other) => other.id !== schedule.id && (other.exclusive || schedule.exclusive || priorityNames[schedule.priority] === "EMERGENCY") && rulesOverlap(schedule.rules, other.rules) && new Date(other.startsAt) < new Date(schedule.endsAt) && new Date(other.endsAt) > new Date(schedule.startsAt) && other.campaign.assignments.some((a) => schedule.campaign.assignments.some((b) => a.displayId === b.displayId)));
          const daysLabel = schedule.rules.days.map((day) => weekdays[day - 1]).join(", ");
          const windowsLabel = schedule.rules.windows.map((window) => `${window.start}–${window.end}`).join(", ") || "All day";
          return <div key={schedule.id} className="grid min-h-16 grid-cols-[180px_minmax(0,1fr)] items-center gap-3 border-b border-neutral-100 px-3 last:border-b-0"><div className="min-w-0"><p className="truncate text-sm font-medium text-neutral-800">{schedule.campaign.name}</p><p className="truncate text-[11px] text-neutral-500">{daysLabel} · {windowsLabel}</p></div><div className="relative h-9 rounded bg-neutral-100"><button type="button" onClick={() => edit(schedule)} aria-label={`Edit ${schedule.campaign.name}, revision ${schedule.revision}${conflict ? ". Exclusive booking overlap detected" : ""}. Active ${daysLabel}, ${windowsLabel}.`} title={conflict ? "Exclusive booking overlap · select to edit" : "Select to edit schedule"} style={{ left: `${left}%`, width: `${width}%`, minWidth: "4rem" }} className={`absolute inset-y-0 truncate rounded px-2 text-left text-xs font-semibold focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black ${conflict ? "border border-red-700 bg-red-50 text-red-900" : "bg-black text-[#dfff00]"}`}>{conflict ? "Overlap" : priorityNames[schedule.priority] ?? "NORMAL"}</button></div></div>;
        })}
      </div></div> : <div className="mt-4 flex flex-col items-start gap-4 rounded-xl bg-[#f2f4ec] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-neutral-900">No schedules in this interval</p><p className="mt-1 text-sm text-neutral-600">Choose another date or plan a new delivery.</p></div><button type="button" onClick={startNewSchedule} className={primaryClass}><Plus size={15} />Plan delivery</button></div>}
    </SectionCard> : <>
      <ol aria-label="Scheduling steps" className="grid gap-2 sm:grid-cols-3">
        {[["Campaign & creative", "Choose approved media."], ["Screens & timing", "Set audience and delivery window."], ["Availability", "Check conflicts before publishing."]].map(([title, detail], index) => <li key={title}><div aria-current={step === index + 1 ? "step" : undefined} className={`flex min-h-[76px] items-start gap-3 rounded-xl border p-4 ${step === index + 1 ? "border-[#dfff00]/50 bg-[#dfff00]/[.07]" : step > index + 1 ? "border-white/15 bg-[#191f24]" : "border-white/10 bg-[#151a1e] opacity-60"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${step === index + 1 ? "bg-[#dfff00] text-black" : "bg-white/10 text-neutral-200"}`}>{index + 1 < step ? <Check size={14} /> : index + 1}</span><span><span className="block text-sm font-semibold text-neutral-100">{title}</span><span className="mt-1 block text-xs leading-5 text-neutral-400">{detail}</span></span></div></li>)}
      </ol>

      {step === 1 && <SectionCard title={revision > 0 ? `Edit schedule · revision ${revision}` : "Campaign and playback"} description="Choose approved media, then set when and how it appears.">
        <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
          <div><Field label="Campaign" hint={selected ? `${selected.ownerEmail ?? "Internal advertiser"} · ${selected.creatives.filter((creative) => creative.status === "APPROVED").length} approved creatives` : "Choose a campaign with approved media. Existing schedules can be edited from Timeline."}>
            <select className={inputClass} value={campaignId} disabled={revision > 0} onChange={(event) => { setCampaign(event.target.value); setRevision(0); setStart(`${today()}T07:00`); setEnd(`${today()}T22:00`); setRules(defaultRules()); setTarget(defaultTarget()); setPriority("NORMAL"); setExclusive(false); setReason(""); setReport(null); setMessage(""); }}><option value="">Select campaign</option>{data.campaigns.map((campaign) => { const hasSchedule = data.schedules.some((schedule) => schedule.campaignId === campaign.id); return <option value={campaign.id} key={campaign.id} disabled={revision === 0 && hasSchedule}>{campaign.name} · {campaign.status.replaceAll("_", " ")}{hasSchedule && revision === 0 ? " · Already scheduled — edit in Timeline" : ""}</option>; })}</select>
          </Field>{selected && <Link className="mt-2 inline-flex text-xs font-medium text-neutral-700 underline underline-offset-4 hover:text-black" href={`/admin/campaigns/${campaignId}`}>Review campaign</Link>}</div>
          <Field label="Priority"><select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value)}>{Object.values(priorityNames).map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Start (IST)"><input className={inputClass} type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
          <Field label="End (IST)" hint="The end time is exclusive; playback stops at this time."><input className={inputClass} type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
        </div>

        <fieldset className="mt-6 border-t border-neutral-200 pt-5"><legend className="px-1 text-sm font-semibold text-neutral-900">Days and time window</legend>
          <div className="mt-2 flex flex-wrap gap-2">{weekdays.map((day, index) => <label key={day} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${rules.days.includes(index + 1) ? "border-black bg-black text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"}`}><input type="checkbox" checked={rules.days.includes(index + 1)} onChange={(event) => setRules({ ...rules, days: event.target.checked ? [...rules.days, index + 1].sort((a, b) => a - b) : rules.days.filter((value) => value !== index + 1) })} className="accent-[var(--brand-yellow)]" />{day}</label>)}</div>
          <label className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm text-neutral-800"><input type="checkbox" checked={exclusive} onChange={(event) => setExclusive(event.target.checked)} className="h-4 w-4 accent-black" />Exclusive placement <span className="text-xs text-neutral-500">Blocks overlapping ads on the selected inventory.</span></label>
          <div className="mt-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-neutral-800">Daily windows <span className="font-normal text-neutral-500">· {rules.windows.length ? "IST" : "All day"}</span></p><button type="button" onClick={() => setRules({ ...rules, windows: [...rules.windows, { start: "07:00", end: "11:00" }] })} className={buttonClass}><Plus size={14} />Add time window</button></div>
            {rules.windows.length ? <div className="space-y-2">{rules.windows.map((window, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:max-w-xl"><Field label={`From · window ${index + 1}`}><input aria-label={`Start time for window ${index + 1}`} type="time" value={window.start} onChange={(event) => setRules({ ...rules, windows: rules.windows.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) })} className={inputClass} /></Field><Field label="To"><input aria-label={`End time for window ${index + 1}`} type="time" value={window.end} onChange={(event) => setRules({ ...rules, windows: rules.windows.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) })} className={inputClass} /></Field><button type="button" aria-label={`Remove time window ${index + 1}`} onClick={() => setRules({ ...rules, windows: rules.windows.filter((_, itemIndex) => itemIndex !== index) })} className={`${buttonClass} mb-0.5 px-3 text-red-700 hover:border-red-300 hover:bg-red-50`}><X size={15} /></button></div>)}</div> : <p className="rounded-lg bg-[#f2f4ec] px-3 py-2.5 text-xs text-neutral-600">All day delivery. Add a window to limit playback hours.</p>}
          </div>
        </fieldset>

        <fieldset className="mt-6 border-t border-neutral-200 pt-5"><legend className="px-1 text-sm font-semibold text-neutral-900">Playback rules</legend>
          <div className="mt-2 grid gap-4 md:grid-cols-3"><Field label="Playback strategy"><select className={inputClass} value={rules.mode} onChange={(event) => setRules({ ...rules, mode: event.target.value })}>{[["WEIGHTED", "Weighted rotation"], ["SEQUENCE", "Fixed sequence"], ["EVERY_MINUTES", "Every X minutes"], ["PLAYS_PER_HOUR", "Plays per hour"], ["PLAYS_PER_DAY", "Plays per day"], ["SHARE", "Share of loop %"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Frequency, weight, or share"><input className={inputClass} type="number" min={1} value={rules.value} onChange={(event) => setRules({ ...rules, value: Number(event.target.value) })} /></Field><Field label="Image duration (seconds)"><input className={inputClass} type="number" min={1} max={120} value={rules.imageDurationSeconds} onChange={(event) => setRules({ ...rules, imageDurationSeconds: Number(event.target.value) })} /></Field></div>
          <Field label="Add approved creative" hint="Add creatives in the order you want them to appear in the sequence."><select className={inputClass} value="" onChange={(event) => { const id = event.target.value; if (id) setRules({ ...rules, creativeIds: [...rules.creativeIds, id] }); }}><option value="">Choose creative</option>{selected?.creatives.filter((creative) => creative.status === "APPROVED").map((creative) => <option key={creative.id} value={creative.id}>{creative.name} · {creative.type}</option>)}</select></Field>
          {rules.creativeIds.length > 0 && <ol aria-label="Creative playback sequence" className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200">{rules.creativeIds.map((id, index) => { const name = selected?.creatives.find((creative) => creative.id === id)?.name ?? id; return <li key={`${id}-${index}`} className="flex min-w-0 items-center gap-2 p-3"><span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-neutral-500">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">{name}</span><button type="button" aria-label={`Move creative ${index + 1} up`} disabled={index === 0} onClick={() => moveCreative(index, -1)} className="grid h-9 w-9 place-items-center rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" aria-label={`Move creative ${index + 1} down`} disabled={index === rules.creativeIds.length - 1} onClick={() => moveCreative(index, 1)} className="grid h-9 w-9 place-items-center rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-30"><ArrowDown size={15} /></button><button type="button" aria-label={`Remove ${name}`} onClick={() => setRules({ ...rules, creativeIds: rules.creativeIds.filter((_, itemIndex) => itemIndex !== index) })} className="grid h-9 w-9 place-items-center rounded-md text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"><X size={15} /></button></li>; })}</ol>}
        </fieldset>
      </SectionCard>}

      {step === 2 && <SectionCard title="Target screens" description="Choose screens, screen groups, or vehicles. Location and route filters narrow the selection.">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-[#f7f7f4] px-4 text-sm font-semibold text-neutral-900"><input type="checkbox" checked={target.all} onChange={(event) => setTarget({ ...target, all: event.target.checked })} className="h-4 w-4 accent-black" />Target all screens</label>
        <div className="mt-4 grid gap-5 lg:grid-cols-3">{([
          ["screenIds", "Screens", data.screens],
          ["groupIds", "Screen groups", data.groups],
          ["vehicleIds", "Vehicles", data.vehicles.map((vehicle) => ({ id: vehicle.id, name: vehicle.registrationNumber }))],
        ] as const).map(([key, label, items]) => <fieldset key={key} className="min-w-0"><legend className="mb-2 flex w-full items-center justify-between gap-2 text-sm font-semibold text-neutral-900"><span>{label}</span><span className="text-xs font-normal tabular-nums text-neutral-500">{target[key].length} selected</span></legend><div className="max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5">{items.length ? items.map((item) => <label key={item.id} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm text-neutral-700 hover:bg-neutral-100"><input type="checkbox" checked={target[key].includes(item.id)} onChange={(event) => toggleTarget(key, item.id, event.target.checked)} className="h-4 w-4 shrink-0 accent-black" /><span className="min-w-0 truncate">{item.name}</span></label>) : <p className="px-3 py-4 text-xs text-neutral-500">No {label.toLowerCase()} available.</p>}</div></fieldset>)}</div>

        <fieldset className="mt-6 border-t border-neutral-200 pt-5"><legend className="px-1 text-sm font-semibold text-neutral-900">Narrow by location and fleet</legend><p className="mt-2 text-xs leading-5 text-neutral-600">These filters narrow every selected screen, group, vehicle, or “all screens” target. A screen can be online and still be excluded when its linked vehicle does not match.</p>{hasFleetFilters && <button type="button" className="mt-2 text-xs font-semibold text-neutral-800 underline underline-offset-4 hover:text-black" onClick={() => setTarget((current) => ({ ...current, city: undefined, area: undefined, vehicleType: undefined, routeId: undefined, depotId: undefined, tags: [], geofence: undefined }))}>Clear location and fleet filters</button>}<div className="mt-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="City"><input className={inputClass} value={target.city ?? ""} onChange={(event) => setTarget({ ...target, city: event.target.value || undefined })} placeholder="Any city" /></Field>
          <Field label="Area"><input className={inputClass} value={target.area ?? ""} onChange={(event) => setTarget({ ...target, area: event.target.value || undefined })} placeholder="Any area" /></Field>
          <Field label="Vehicle type"><input className={inputClass} value={target.vehicleType ?? ""} onChange={(event) => setTarget({ ...target, vehicleType: event.target.value || undefined })} placeholder="Any vehicle type" /></Field>
          <Field label="Route"><select className={inputClass} value={target.routeId ?? ""} onChange={(event) => setTarget({ ...target, routeId: event.target.value || undefined })}><option value="">All routes</option>{data.routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Depot"><select className={inputClass} value={target.depotId ?? ""} onChange={(event) => setTarget({ ...target, depotId: event.target.value || undefined })}><option value="">All depots</option>{data.depots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Tags" hint="Separate tags with commas."><input className={inputClass} value={target.tags.join(", ")} onChange={(event) => setTarget({ ...target, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="e.g. premium, airport" /></Field>
        </div></fieldset>
        <div className="mt-5"><label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-neutral-800"><input type="checkbox" checked={!!target.geofence} onChange={(event) => setTarget({ ...target, geofence: event.target.checked ? { latitude: 17.385, longitude: 78.4867, radiusKm: 5 } : undefined })} className="h-4 w-4 accent-black" />Use radius targeting <span className="text-xs font-normal text-neutral-500">Location is checked when publishing.</span></label>{target.geofence && <div className="mt-2 grid gap-4 sm:grid-cols-3">{([ ["latitude", "Center latitude"], ["longitude", "Center longitude"], ["radiusKm", "Radius (km)"] ] as const).map(([key, label]) => <Field key={key} label={label}><input type="number" step="any" className={inputClass} value={target.geofence![key]} onChange={(event) => setTarget({ ...target, geofence: { ...target.geofence!, [key]: Number(event.target.value) } })} /></Field>)}</div>}</div>
        <Link href="/admin/screen-groups" className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-black">Manage screen groups</Link>
      </SectionCard>}

      {step === 3 && <SectionCard title="Availability and publish" description="Pacing targets depend on device uptime. Inventory checks include existing bookings.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f2f4ec] px-4 py-3"><div><p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Target summary</p><p className="mt-1 text-sm font-semibold text-neutral-900">{targetSummary}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${report ? report.canPublish ? "bg-[#e7f0c8] text-[#405316]" : "bg-red-100 text-red-900" : "bg-neutral-200 text-neutral-700"}`}>{report ? report.canPublish ? "Ready to publish" : "Needs attention" : "Not checked"}</span></div>

        {canOverrideInventory && <details className="mt-4 rounded-lg border border-neutral-200 p-4 text-sm"><summary className="cursor-pointer font-medium text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black">Advanced · inventory override</summary><p className="mt-2 text-xs leading-5 text-neutral-500">Use only for an approved exception to an exclusive inventory conflict. The reason is recorded in the audit log.</p><Field label="Override reason"><input className={inputClass} value={overrideReason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the exception" /></Field></details>}

        {report && <div className="my-4"><dl className="grid gap-3 border-y border-neutral-200 py-4 sm:grid-cols-3"><div><dt className="text-xs text-neutral-500">Eligible screens</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-neutral-950">{report.eligibleScreens}</dd></div><div><dt className="text-xs text-neutral-500">Offline screens</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-neutral-950">{report.offlineScreens}</dd></div><div><dt className="text-xs text-neutral-500">Reserved slot-days</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-neutral-950">{report.reservedSlotDays}</dd></div></dl><p className="mt-3 text-xs text-neutral-600">Offline paired screens receive queued schedule updates when they reconnect. Playback starts after sync.</p>
          {report.conflicts.length ? <ul className="mt-4 space-y-2">{report.conflicts.map((conflict, index) => <li key={`${conflict.code}-${index}`} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>{conflict.message}{conflict.screenId ? ` · ${conflict.screenId}` : ""}</span></li>)}</ul> : <p className="mt-3 flex items-center gap-2 text-sm text-[#465719]"><Check size={15} />No blocking conflicts detected.</p>}</div>}

        {publishBlocker && <p role="status" className="mt-4 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700">{publishBlocker}</p>}
        {checkBlocker && <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Before checking availability: {checkBlocker}</p>}
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-500">{busy ? "Saving schedule…" : revision > 0 ? `Updating revision ${revision}` : "Your schedule is saved when published."}</p><div className="flex flex-col gap-2 sm:flex-row"><button type="button" disabled={busy || !!checkBlocker} onClick={() => void submit("check")} className={buttonClass}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <CalendarDays size={15} />}{busy ? "Checking…" : "Check availability"}</button><button type="button" disabled={busy || !!publishBlocker || !!checkBlocker} onClick={() => void submit("publish")} className={primaryClass}>{busy ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}{busy ? "Publishing…" : "Publish schedule"}</button></div></div>
      </SectionCard>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => { setError(""); setStep(Math.max(1, step - 1)); }} disabled={step === 1} className={buttonClass}>Back</button>
        {step < 3 ? <button type="button" className={primaryClass} onClick={() => {
          const blocker = step === 1
            ? (!campaignId ? "Choose a campaign first." : !selected?.creatives.some(creative => creative.status === "APPROVED") ? "This campaign has no approved creative. Upload and approve one before scheduling." : !rules.creativeIds.length ? "Add at least one approved creative to the playback sequence." : !start || !end || start >= end ? "Set a valid start and end time." : null)
            : !hasTarget ? "Choose at least one screen or targeting filter." : null;
          if (blocker) { setError(blocker); return; }
          setError(""); setMessage(""); setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" });
        }}>{step === 1 ? "Choose screens" : "Review availability"} <ArrowDown size={15} /></button> : <span className="text-xs text-neutral-500">Check availability, resolve conflicts, then publish.</span>}
      </div>
    </>}
  </div>;
}
