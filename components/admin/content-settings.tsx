"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, SectionCard } from "@/components/app/app-ui";
import { AdminSubnav } from "./admin-ui";

type News = { id: string; text: string; city?: string | null; priority: number; active: boolean; startsAt?: string | null; endsAt?: string | null };
type Screen = { screenId: string; screenName: string; city?: string | null };
type Zone = { primaryWidthPercent: number; adHeightPercent: number; qrHeightPercent: number; newsScrollSpeed: number; layoutContractVersion: number | null };

const initialZone: Zone = { primaryWidthPercent: 67, adHeightPercent: 86, qrHeightPercent: 47, newsScrollSpeed: 42, layoutContractVersion: null };
const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#dfff00] focus:ring-2 focus:ring-[#dfff00]/20";
const primaryButton = "inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-yellow)] px-4 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50";

export function ContentSettings() {
  const [news, setNews] = useState<News[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [screenId, setScreenId] = useState("");
  const [text, setText] = useState("");
  const [city, setCity] = useState("");
  const [priority, setPriority] = useState(0);
  const [zone, setZone] = useState<Zone>(initialZone);
  const [savedContractVersion, setSavedContractVersion] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const v3Supported = zone.layoutContractVersion !== null;
  const isV3 = zone.layoutContractVersion === 3;
  const isV3Active = savedContractVersion === 3;

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [newsResponse, screenResponse] = await Promise.all([
        fetch("/api/admin/news", { cache: "no-store" }),
        fetch("/api/admin/screens", { cache: "no-store" }),
      ]);
      const [newsBody, screenBody] = await Promise.all([newsResponse.json(), screenResponse.json()]);
      if (!newsResponse.ok || !screenResponse.ok) throw new Error("Could not load display content. Retry or contact an administrator.");
      setNews(newsBody.data || []);
      setScreens(screenBody.data || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load display content.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!screenId) { setZone(initialZone); setSavedContractVersion(null); return; }
    setZone(initialZone);
    setSavedContractVersion(null);
    setError("");
    let active = true;
    setSaved("");
    fetch(`/api/admin/screens/${screenId}/zones`, { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Screen layout could not be loaded.");
        if (active && body.data) {
          const version = Number.isInteger(body.data.layoutContractVersion) ? body.data.layoutContractVersion : null;
          setZone({ primaryWidthPercent: body.data.primaryWidthPercent ?? 67, adHeightPercent: body.data.adHeightPercent ?? 86, qrHeightPercent: body.data.qrHeightPercent ?? 47, newsScrollSpeed: body.data.newsScrollSpeed ?? 42, layoutContractVersion: version });
          setSavedContractVersion(version);
        }
      })
      .catch(caught => { if (active) setError(caught instanceof Error ? caught.message : "Screen layout could not be loaded."); });
    return () => { active = false; };
  }, [screenId]);

  async function createNews() {
    setError(""); setSaved("");
    const response = await fetch("/api/admin/news", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, city: city || null, priority, active: true }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message || "Announcement could not be saved."); return; }
    setText(""); setSaved("Announcement published."); await load();
  }

  async function toggleNews(item: News) {
    setError(""); setSaved("");
    const response = await fetch("/api/admin/news", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, active: !item.active }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message || "Announcement could not be updated."); return; }
    setSaved(item.active ? "Announcement disabled." : "Announcement enabled."); await load();
  }

  async function saveZone() {
    if (!screenId) return;
    setError(""); setSaved("");
    const { layoutContractVersion, ...legacyZone } = zone;
    const payload = layoutContractVersion === null ? legacyZone : { ...legacyZone, layoutContractVersion };
    const response = await fetch(`/api/admin/screens/${screenId}/zones`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) { setError(body.error?.message || "Screen layout could not be saved."); return; }
    setSavedContractVersion(zone.layoutContractVersion);
    setSaved("Layout saved. The screen will receive it on its next manifest sync.");
  }

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader eyebrow="Admin / Display content" title="Display content" description="Manage the screen layout and the content that appears in each zone." />
    <AdminSubnav />

    <section className="rounded-2xl border border-white/10 bg-[#191f24] p-5 sm:p-6" aria-labelledby="sponsored-placement-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-eyebrow">Screen placement</p>
          <h2 id="sponsored-placement-title" className="mt-2 text-lg font-semibold text-neutral-100">Sponsored strip replaces the news ticker</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">On V3 screens, the lower strip is reserved for a sponsored image. Create it as a campaign and choose <strong className="font-semibold text-neutral-200">Sponsored placement</strong>; it will not be managed as a news announcement.</p>
        </div>
        <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${isV3 ? "border-lime-400/30 bg-lime-400/10 text-lime-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>{isV3Active ? "V3 layout active" : isV3 ? "V3 selected · save to activate" : "Legacy layout active"}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-neutral-500">Main creative</p><p className="mt-1 text-sm font-medium text-neutral-200">Full-size campaign area</p></div>
        <div className="rounded-xl border border-[#dfff00]/30 bg-[#dfff00]/[.06] p-4"><p className="text-xs text-[#dfff00]/70">Sponsored strip</p><p className="mt-1 text-sm font-medium text-neutral-100">Image campaign · dedicated slot</p></div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-neutral-500">Offer & navigation</p><p className="mt-1 text-sm font-medium text-neutral-200">QR and route panel</p></div>
      </div>
      {!v3Supported && <p className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/[.06] px-4 py-3 text-xs leading-5 text-amber-100">This API does not report a V3 layout contract yet. V3 controls stay locked until the migration and compatible API are deployed; existing screens keep their current layout.</p>}
    </section>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
      <SectionCard title="Legacy news ticker" description="These global and city announcements are delivered only to V1/V2 players. V3 screens use the sponsored strip instead.">
        <label className="block text-sm font-medium">Announcement<textarea value={text} onChange={event => setText(event.target.value)} maxLength={500} placeholder="Write a short passenger announcement" className={`${fieldClass} min-h-28 py-3`} /></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_150px]">
          <label className="block text-sm font-medium">City targeting<input value={city} onChange={event => setCity(event.target.value)} placeholder="All cities" className={fieldClass} /></label>
          <label className="block text-sm font-medium">Priority<input type="number" value={priority} onChange={event => setPriority(Number(event.target.value) || 0)} className={fieldClass} /></label>
        </div>
        <button type="button" onClick={() => void createNews()} disabled={!text.trim()} className={`${primaryButton} mt-4`}>Publish announcement</button>
        <div className="mt-7 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-neutral-200">Existing announcements</h3><span className="text-xs text-neutral-500">{news.length} total</span></div>
          {loading ? <p className="py-6 text-sm text-neutral-500">Loading announcements…</p> : news.length ? <ul className="mt-3 divide-y divide-white/10">{news.map(item => <li className="flex items-start justify-between gap-4 py-4" key={item.id}><div className="min-w-0"><p className="break-words text-sm text-neutral-200">{item.text}</p><p className="mt-1 text-xs text-neutral-500">{item.city || "All cities"} · Priority {item.priority} · {item.active ? "Active" : "Disabled"}</p></div><button type="button" onClick={() => void toggleNews(item)} className="shrink-0 text-xs font-semibold text-[#dfff00] underline underline-offset-4">{item.active ? "Disable" : "Enable"}</button></li>)}</ul> : <p className="py-6 text-sm text-neutral-500">No announcements yet.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Screen layout" description="Choose a screen to inspect its current layout and update supported settings.">
        <label className="block text-sm font-medium">Screen<select value={screenId} onChange={event => setScreenId(event.target.value)} className={fieldClass}><option value="">Select a screen</option>{screens.map(screen => <option value={screen.screenId} key={screen.screenId}>{screen.screenName} · {screen.city || "City not set"}</option>)}</select></label>
        {!screenId ? <p className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-6 text-neutral-400">Select a screen to see its layout contract and available controls.</p> : !v3Supported ? <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-sm font-medium text-neutral-200">Current layout: legacy configuration</p><p className="mt-1 text-xs leading-5 text-neutral-500">The server has not returned a layout contract version. V3 cannot be enabled safely from this admin build.</p></div> : <>
          <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4"><p className="text-xs text-neutral-500">Current contract</p><p className="mt-1 text-sm font-semibold text-neutral-100">V{zone.layoutContractVersion} · {isV3Active ? "Sponsored strip active · no news ticker" : isV3 ? "Sponsored strip selected · not saved yet" : zone.layoutContractVersion === 2 ? "Legacy layout with news ticker" : "Legacy geometry"}</p></div>
          <label className="mt-4 block text-sm font-medium">Player layout<select value={zone.layoutContractVersion ?? 2} onChange={event => setZone(current => ({ ...current, layoutContractVersion: Number(event.target.value) }))} className={fieldClass}><option value={1}>V1 · legacy geometry</option><option value={2}>V2 · sidebar with news ticker</option><option value={3}>V3 · sponsored strip, no ticker</option></select><span className="mt-1.5 block text-xs leading-5 text-neutral-500">Enable V3 only after the compatible Screen Player is installed and the V3 API migration is deployed.</span></label>
          {!isV3 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{([["primaryWidthPercent","Primary area width (%)"],["adHeightPercent","Main creative height (%)"],["qrHeightPercent","QR area height (%)"],["newsScrollSpeed","Legacy ticker speed"]] as const).map(([key,label]) => <label className="block text-sm font-medium" key={key}>{label}<input type="number" value={zone[key]} onChange={event => setZone(current => ({ ...current, [key]: Number(event.target.value) || 0 }))} className={fieldClass} /></label>)}</div>}
          {isV3 && <p className="mt-4 rounded-lg border border-[#dfff00]/20 bg-[#dfff00]/[.05] p-4 text-sm leading-6 text-neutral-200">V3 uses a fixed sponsored strip. Create or edit the sponsor from <Link href="/admin/campaigns/new" className="font-semibold text-[#dfff00] underline underline-offset-4">Campaigns</Link>; no ticker text or speed setting is used.</p>}
          <button type="button" onClick={() => void saveZone()} className={`${primaryButton} mt-5`}>Save layout</button>
        </>}
      </SectionCard>
    </div>

    {(error || saved) && <p role={error ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-400/30 bg-red-500/10 text-red-200" : "border-lime-400/20 bg-lime-400/[.06] text-lime-100"}`}>{error || saved}</p>}
  </div>;
}
