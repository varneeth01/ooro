"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, PageHeader, PrimaryButton, SecondaryButton, SelectField } from "./app-ui";

const steps = ["Basics", "Goal", "Audience", "Location", "Schedule", "Media", "Creative", "Budget", "Review"];
type Display = { displayId: string; name: string; deviceId: string; state: string };
type Draft = { name: string; brand: string; promotion: string; description: string; goal: string; audience: string; age: string; interests: string; customer: string; city: string; area: string; pin: string; radius: string; start: string; end: string; days: string[]; time: string; timezone: string; media: string; creativeName: string; creativeId?: string; assetId?: string; creativeChecksum?: string; currency: string; budget: string; targetDisplays: string[]; campaignId?: string };
type Setter = (key: string, value: string | string[]) => void;
type Delivery = { displayName: string; online: boolean; deliveryState: string; commandStatus: string; assetPersisted: boolean };

const initial: Draft = { name: "", brand: "", promotion: "", description: "", goal: "Brand awareness", audience: "", age: "All ages", interests: "", customer: "", city: "Bengaluru", area: "Koramangala", pin: "", radius: "3 km", start: "", end: "", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], time: "Evening", timezone: "Asia/Kolkata", media: "OORO Auto Screens", creativeName: "", currency: "INR", budget: "", targetDisplays: [] };

function validate(draft: Draft, step?: number) {
  const errors: string[] = [];
  const applies = (index: number) => step === undefined || step === index;
  if (applies(0) && (!draft.name.trim() || !draft.promotion.trim())) errors.push("Add a campaign name and promotion");
  if (applies(2) && !draft.audience.trim()) errors.push("Define your target audience");
  if (applies(3) && (!draft.city.trim() || !draft.area.trim())) errors.push("Choose a city and area");
  if (applies(4)) {
    const start = draft.start ? new Date(`${draft.start}T00:00:00`) : null;
    const end = draft.end ? new Date(`${draft.end}T00:00:00`) : null;
    if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) errors.push("Choose valid start and end dates");
    else if (end < start) errors.push("End date must be on or after start date");
    else if (start < new Date(new Date().toDateString())) errors.push("Start date cannot be in the past");
    if (!draft.days.length) errors.push("Choose at least one day");
  }
  if (applies(5) && (!draft.media || !draft.targetDisplays.length)) errors.push("Select OORO Auto Screens and at least one display");
  if (applies(6) && !draft.creativeId) errors.push("Persist a creative before continuing");
  if (applies(7) && (!Number.isFinite(Number(draft.budget)) || Number(draft.budget) <= 0)) errors.push("Set a budget greater than zero");
  return errors;
}

async function readMediaMetadata(file: File) {
  if (file.type.startsWith("image/") && typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const result = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return result;
  }
  if (file.type.startsWith("video/")) {
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<{ width: number; height: number; durationSeconds: number }>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, durationSeconds: Math.max(1, Math.round(video.duration || 10)) });
        video.onerror = () => reject(new Error("Video metadata could not be read"));
        video.src = url;
      });
    } finally { URL.revokeObjectURL(url); }
  }
  return {};
}

export function CampaignWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial);
  const [displays, setDisplays] = useState<Display[]>([]);
  const [brands, setBrands] = useState<Array<{ name: string }>>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ooro.campaign-draft");
      if (raw) setDraft(current => ({ ...current, ...JSON.parse(raw) }));
    } catch { /* recovery cache is optional; backend remains authoritative */ }
    const brief = new URLSearchParams(window.location.search).get("brief")?.trim() || "";
    if (brief) setDraft(current => ({ ...current, description: current.description || brief }));
    fetch("/api/campaigns/displays", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(payload => setDisplays(payload.data ?? [])).catch(() => setDisplays([]));
    fetch("/api/brands", { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(payload => setBrands(payload.data ?? [])).catch(() => setBrands([]));
  }, []);

  const set: Setter = (key, value) => { setError(""); setDraft(current => ({ ...current, [key]: value } as Draft)); };
  const payload = (status?: "DRAFT" | "SCHEDULED") => ({ name: draft.name, description: draft.description, goal: draft.goal, audience: draft.audience, city: draft.city, area: draft.area, startDate: draft.start || undefined, endDate: draft.end || undefined, media: draft.media, budget: draft.budget ? Number(draft.budget) : undefined, currency: draft.currency, ...(status ? { status } : {}), metadata: draft });

  async function ensureCampaign(status?: "DRAFT" | "SCHEDULED") {
    if (draft.campaignId) {
      const response = await fetch(`/api/campaigns/${draft.campaignId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(status)) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error?.message || "Campaign could not be updated");
      return draft.campaignId;
    }
    const response = await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload(status)) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error?.message || "Campaign could not be saved");
    setDraft(current => ({ ...current, campaignId: result.data.id }));
    return result.data.id as string;
  }

  async function upload(file: File) {
    if (file.size > 100 * 1024 * 1024) throw new Error("Creative must be smaller than 100 MB");
    if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(file.type)) throw new Error("Use JPG, PNG, WebP, MP4 or WebM");
    if (!draft.targetDisplays.length) throw new Error("Select at least one display first");
    const id = await ensureCampaign();
    const metadata = await readMediaMetadata(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    const response = await fetch(`/api/campaigns/${id}/creative`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64: btoa(binary), displayIds: draft.targetDisplays, ...metadata }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error?.message || "Creative upload failed");
    setDraft(current => ({ ...current, campaignId: id, creativeName: file.name, creativeId: result.data.creativeId, assetId: result.data.assetId, creativeChecksum: result.data.checksum }));
  }

  async function save(status: "DRAFT" | "SCHEDULED" = "DRAFT") {
    const errors = validate(draft);
    if (errors.length) { setError(errors[0]); return; }
    try { await ensureCampaign(status); window.localStorage.setItem("ooro.campaign-draft", JSON.stringify(draft)); setSaved(true); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Campaign could not be saved"); }
  }

  async function continueSetup() {
    if (finalError) { setError(finalError); return; }
    setContinuing(true);
    setError("");
    try {
      const campaignId = await ensureCampaign();
      const response = await fetch(`/api/campaigns/${campaignId}/continue`, { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error?.message || "Campaign setup could not continue");
      router.push(`/campaigns/${campaignId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Campaign setup could not continue");
      setContinuing(false);
    }
  }

  const stepError = validate(draft, step)[0];
  const finalError = validate(draft)[0];
  const next = () => { if (stepError) { setError(stepError); return; } setStep(current => Math.min(current + 1, 8)); };

  return <div className="space-y-8"><PageHeader eyebrow="Campaign builder" title="Create campaign" description="Persist a campaign and deliver its creative to selected OORO screens." action={<span className="text-xs text-neutral-500">{saved ? "Saved" : `Step ${step + 1} of 9`}</span>}/><div className="overflow-x-auto border-b pb-5"><div className="flex min-w-max gap-1">{steps.map((label, index) => <button type="button" key={label} onClick={() => index <= step && setStep(index)} className="flex items-center gap-2 px-2 py-2 text-xs"><span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${step === index ? "border-black bg-black text-white" : "border-neutral-300"}`}>{index < step ? <Check size={12}/> : index + 1}</span>{label}</button>)}</div></div><div className="grid gap-8 lg:grid-cols-[1fr_280px]"><div className="border bg-white p-5 sm:p-8">{step === 0 && <Basics draft={draft} set={set} brands={brands.map(brand => brand.name)}/>} {step === 1 && <Goal draft={draft} set={set}/>} {step === 2 && <Audience draft={draft} set={set}/>} {step === 3 && <Location draft={draft} set={set}/>} {step === 4 && <Schedule draft={draft} set={set}/>} {step === 5 && <Media draft={draft} set={set} displays={displays}/>} {step === 6 && <Creative draft={draft} upload={upload}/>} {step === 7 && <Budget draft={draft} set={set}/>} {step === 8 && <Review draft={draft} displays={displays}/>} {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>} {stepError && !error && <p className="mt-5 text-xs text-neutral-500">{stepError}</p>}<div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-5">{step ? <button type="button" onClick={() => { setError(""); setStep(step - 1); }} className="inline-flex items-center gap-2 text-sm text-neutral-500"><ArrowLeft size={15}/>Back</button> : <Link href="/campaigns" className="text-sm text-neutral-500">Cancel</Link>}{step < 8 ? <PrimaryButton onClick={next} disabled={Boolean(stepError)}>Continue<ArrowRight className="ml-4" size={15}/></PrimaryButton> : <div className="flex flex-wrap gap-3"><SecondaryButton onClick={() => void save()} disabled={Boolean(finalError) || continuing}>Save draft</SecondaryButton><PrimaryButton onClick={() => void continueSetup()} disabled={Boolean(finalError) || continuing}>{continuing ? "Continuing…" : "Continue setup"}</PrimaryButton></div>}</div></div><aside className="hidden lg:block"><div className="border bg-[#fafaf8] p-5 text-xs"><div className="app-eyebrow">Delivery overview</div><p className="mt-4">Displays: <strong>{draft.targetDisplays.length}</strong></p><p className="mt-2">Creative: <strong>{draft.creativeId ? "Persisted" : "Not persisted"}</strong></p><p className="mt-2">Checksum: <span className="break-all">{draft.creativeChecksum || "—"}</span></p></div></aside></div></div>;
}

function Basics({ draft, set, brands }: { draft: Draft; set: Setter; brands: string[] }) { return <div className="space-y-6"><Title title="Start with the basics" text="Name the campaign and promotion."/><FormField label="Campaign name" name="name" value={draft.name} onChange={value => set("name", value)} required/><SelectField label="Brand" name="brand" value={draft.brand} onChange={value => set("brand", value)} options={brands}/><FormField label="What are you promoting?" name="promotion" value={draft.promotion} onChange={value => set("promotion", value)} required/><FormField label="Description" name="description" value={draft.description} onChange={value => set("description", value)}/></div>; }
function Goal({ draft, set }: { draft: Draft; set: Setter }) { return <div><Title title="Choose a goal" text="What should the campaign achieve?"/><div className="divide-y border-y">{["Brand awareness", "Reach", "Store visits", "Website traffic", "Leads", "Sales", "Event promotion"].map(goal => <button type="button" key={goal} onClick={() => set("goal", goal)} className="flex w-full justify-between py-4 text-left text-sm">{goal}<span className={`h-4 w-4 rounded-full border ${draft.goal === goal ? "border-black bg-[var(--brand-yellow)]" : "border-neutral-300"}`}/></button>)}</div></div>; }
function Audience({ draft, set }: { draft: Draft; set: Setter }) { return <div className="space-y-6"><Title title="Define the audience" text="Describe who should see this campaign."/><label className="block text-sm font-medium">Target audience<textarea required value={draft.audience} onChange={event => set("audience", event.target.value)} rows={4} className="mt-2 block w-full rounded border px-3 py-3"/></label><FormField label="Age range" name="age" value={draft.age} onChange={value => set("age", value)}/><FormField label="Interests" name="interests" value={draft.interests} onChange={value => set("interests", value)}/></div>; }
function Location({ draft, set }: { draft: Draft; set: Setter }) { return <div className="grid gap-6 sm:grid-cols-2"><Title title="Choose a location" text="Set geographic targeting."/><div className="grid gap-5 sm:col-span-2 sm:grid-cols-2"><FormField label="City" name="city" value={draft.city} onChange={value => set("city", value)} required/><FormField label="Area" name="area" value={draft.area} onChange={value => set("area", value)} required/><FormField label="Pin code" name="pin" value={draft.pin} onChange={value => set("pin", value)}/><SelectField label="Radius" name="radius" value={draft.radius} onChange={value => set("radius", value)} options={["1 km", "2 km", "3 km", "5 km"]}/></div></div>; }
function Schedule({ draft, set }: { draft: Draft; set: Setter }) { return <div className="space-y-6"><Title title="Set the schedule" text="Choose valid future dates."/><div className="grid gap-5 sm:grid-cols-2"><FormField label="Start date" name="start" type="date" value={draft.start} onChange={value => set("start", value)} required/><FormField label="End date" name="end" type="date" value={draft.end} onChange={value => set("end", value)} required/></div><div><span className="text-sm font-medium">Days</span><div className="mt-2 flex flex-wrap gap-2">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <button type="button" key={day} onClick={() => set("days", draft.days.includes(day) ? draft.days.filter(item => item !== day) : [...draft.days, day])} className={`rounded border px-3 py-2 text-xs ${draft.days.includes(day) ? "bg-black text-white" : ""}`}>{day}</button>)}</div></div></div>; }
function Media({ draft, set, displays }: { draft: Draft; set: Setter; displays: Display[] }) { return <div className="space-y-6"><Title title="Choose displays" text="Only selected displays receive this campaign."/><p className="border p-4 text-sm">OORO Auto Screens · {draft.targetDisplays.length} selected</p><div className="divide-y border-y">{displays.length ? displays.map(display => <label key={display.displayId} className="flex items-center gap-3 py-3 text-sm"><input type="checkbox" checked={draft.targetDisplays.includes(display.displayId)} onChange={() => set("targetDisplays", draft.targetDisplays.includes(display.displayId) ? draft.targetDisplays.filter(id => id !== display.displayId) : [...draft.targetDisplays, display.displayId])}/>{display.name}<span className="text-xs text-neutral-400">{display.state}</span></label>) : <p className="py-4 text-sm text-neutral-500">No paired displays available.</p>}</div></div>; }
function Creative({ draft, upload }: { draft: Draft; upload: (file: File) => Promise<void> }) { const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); return <div className="space-y-6"><Title title="Upload a creative" text="The file will be persisted and queued for selected displays."/><label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center border border-dashed p-6 text-center"><Upload size={24}/><span className="mt-3 text-sm font-medium">Choose image or video</span><span className="mt-1 text-xs text-neutral-500">JPG, PNG, WebP, MP4 or WebM · max 100 MB</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setBusy(true); setMessage(""); try { await upload(file); setMessage("Persisted and queued for selected displays"); } catch (caught) { setMessage(caught instanceof Error ? caught.message : "Upload failed"); } finally { setBusy(false); } }}/></label>{message && <p role="status" className="text-sm">{message}</p>}{draft.creativeId && <div className="border border-green-200 bg-green-50 p-4 text-sm"><strong>{draft.creativeName}</strong><p className="mt-1 text-xs">Persisted: YES · Asset {draft.assetId} · {draft.creativeChecksum}</p></div>}</div>; }
function Budget({ draft, set }: { draft: Draft; set: Setter }) { return <div className="space-y-6"><Title title="Set a budget" text="A positive budget is required."/><div className="grid gap-5 sm:grid-cols-2"><SelectField label="Currency" name="currency" value={draft.currency} onChange={value => set("currency", value)} options={["INR", "USD"]}/><FormField label="Budget" name="budget" type="number" value={draft.budget} onChange={value => set("budget", value)} required/></div></div>; }
function Review({ draft, displays }: { draft: Draft; displays: Display[] }) { const assigned = displays.filter(display => draft.targetDisplays.includes(display.displayId)).length; const [delivery, setDelivery] = useState<Delivery[]>([]); useEffect(() => { if (!draft.campaignId) return; fetch(`/api/campaigns/${draft.campaignId}/delivery`, { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(payload => setDelivery(payload.data ?? [])).catch(() => setDelivery([])); }, [draft.campaignId]); const ready = delivery.filter(item => item.deliveryState === "READY").length; const pending = delivery.filter(item => !["READY", "FAILED"].includes(item.deliveryState)).length; const failed = delivery.filter(item => item.deliveryState === "FAILED").length; return <div><Title title="Review delivery" text="Readiness is based on persisted backend state."/><div className="divide-y border-y">{[["Schedule", `${draft.start || "Not set"} — ${draft.end || "Not set"}`], ["Creative", draft.creativeId ? `${draft.creativeName} · Persisted: YES` : "Not persisted"], ["Assigned displays", String(assigned)], ["Synced displays", String(ready)], ["Pending displays", String(pending)], ["Failed displays", String(failed)], ["Delivery", draft.creativeId ? "Manifest refresh queued" : "Blocked"], ["Budget", draft.budget ? `${draft.currency} ${draft.budget}` : "Not set"]].map(([label, value]) => <div key={label} className="grid gap-2 py-4 sm:grid-cols-[160px_1fr]"><span className="text-xs text-neutral-500">{label}</span><span className="text-sm">{value}</span></div>)}</div>{delivery.length > 0 && <div className="mt-5 space-y-2">{delivery.map(item => <div key={item.displayName} className="flex justify-between border p-3 text-xs"><span>{item.displayName}</span><span>{item.online ? "ONLINE" : "OFFLINE"} · {item.deliveryState} · {item.assetPersisted ? "ASSET READY" : "ASSET MISSING"}</span></div>)}</div>}</div>; }
function Title({ title, text }: { title: string; text: string }) { return <div className="mb-8 sm:col-span-2"><h2 className="text-2xl font-medium">{title}</h2><p className="mt-2 text-sm text-neutral-500">{text}</p></div>; }
