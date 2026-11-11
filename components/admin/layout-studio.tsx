"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, CircleAlert, Cloud, Copy, Grid2X2, Layers2, Maximize2, Monitor, MousePointer2, Plus, Redo2, Save, ShieldCheck, Sparkles, Undo2, WandSparkles } from "lucide-react";
import { keyboardMoveLayoutZoneGeometry, moveLayoutZoneGeometry, pointerDeltaToLayoutUnits, resizeLayoutZoneGeometry, standardV3Draft, type LayoutDraft, type LayoutZone, type WidgetType } from "@/apps/api/src/domain/layout-studio";

type SavedLayout = { id: string; name: string; mode: string; preset: string; state: string; rowVersion: number; draftContract: LayoutDraft; revisions?: Array<{ id: string; revision: number; contractHash: string; publishedAt: string }> };
type ContentCatalog = { creatives: Array<{ id: string; name: string; type: string; campaign: { id: string; name: string; deliverySlot: string } }>; destinations: Array<{ id: string; ctaType: string; campaign: { name: string } }> };
const widgets: Array<{ type: WidgetType; label: string; detail: string }> = [
  { type: "MAIN_AD", label: "Main advertisement", detail: "Server-authorized campaign slot" },
  { type: "SPONSORED_AD", label: "Sponsored advertisement", detail: "Independent sponsor authorization" },
  { type: "IMAGE", label: "Image", detail: "Approved media reference" },
  { type: "VIDEO", label: "Video", detail: "Decoder capability required" },
  { type: "QR_OFFER", label: "QR / offer", detail: "Authorized destination only" },
  { type: "TEXT", label: "Text", detail: "Static text widget" },
  { type: "LOGO", label: "Logo", detail: "Approved brand asset" },
  { type: "NAVIGATION_MAP", label: "Navigation map", detail: "Map capability required" },
  { type: "CLOCK", label: "Digital clock", detail: "Low resource" },
  { type: "WEATHER", label: "Weather", detail: "Network data source" },
  { type: "TICKER", label: "Ticker", detail: "Animation capability required" },
];
const presets = ["65_35", "50_50", "FULLSCREEN", "MAIN_SIDEBAR", "GRID", "CUSTOM_CANVAS"] as const;
const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sameGeometry = (a: LayoutZone["geometry"], b: LayoutZone["geometry"]) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
const isEditableTarget = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));

type ActivePointerGesture = {
  id: string;
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  geometry: LayoutZone["geometry"];
  latestGeometry: LayoutZone["geometry"];
  pendingGeometry: LayoutZone["geometry"] | null;
  element: HTMLElement;
  started: boolean;
  beforeDraft: LayoutDraft;
  beforeDirty: boolean;
};

function applyZoneGeometryStyle(element: HTMLElement, geometry: LayoutZone["geometry"]) {
  element.style.left = `${geometry.x * 100}%`;
  element.style.top = `${geometry.y * 100}%`;
  element.style.width = `${geometry.width * 100}%`;
  element.style.height = `${geometry.height * 100}%`;
}

function newZone(type: WidgetType, index: number): LayoutZone {
  const presets: Record<string, { x: number; y: number; width: number; height: number }> = {
    MAIN_AD: { x: .05, y: .05, width: .58, height: .9 }, SPONSORED_AD: { x: .65, y: .72, width: .3, height: .22 },
    QR_OFFER: { x: .67, y: .05, width: .28, height: .28 }, NAVIGATION_MAP: { x: .67, y: .39, width: .28, height: .56 },
    VIDEO: { x: .05, y: .05, width: .58, height: .65 }, IMAGE: { x: .05, y: .05, width: .58, height: .65 },
    TEXT: { x: .12, y: .38, width: .55, height: .2 }, LOGO: { x: .7, y: .08, width: .22, height: .16 },
    BACKGROUND_IMAGE: { x: 0, y: 0, width: 1, height: 1 }, CLOCK: { x: .7, y: .68, width: .22, height: .16 },
    WEATHER: { x: .7, y: .45, width: .22, height: .18 }, TICKER: { x: .05, y: .83, width: .58, height: .1 },
    STATIC_QR: { x: .7, y: .2, width: .2, height: .25 }, EXTERNAL_DESTINATION: { x: .7, y: .2, width: .2, height: .2 },
  };
  return { id: `zone-${Date.now()}-${index}`, type, label: type.replaceAll("_", " "), schemaVersion: 1, geometry: { ...(presets[type] ?? presets.TEXT) }, zIndex: index, fit: "FIT", contentBinding: { kind: "NONE" }, visible: true };
}

function presetDraft(preset: typeof presets[number]): LayoutDraft {
  const base = standardV3Draft();
  base.mode = "CUSTOM"; base.preset = preset; base.profileId = "OORO_PREMIUM";
  const zone = (id: string, type: WidgetType, label: string, x: number, y: number, width: number, height: number, zIndex: number): LayoutZone => ({ id, type, label, schemaVersion: 1, geometry: { x, y, width, height }, zIndex, fit: "FIT", contentBinding: { kind: "NONE" }, visible: true });
  if (preset === "FULLSCREEN") base.zones = [zone("primary", "IMAGE", "Primary content", 0, 0, 1, 1, 0)];
  else if (preset === "65_35") base.zones = [zone("primary", "MAIN_AD", "Main content", 0, 0, .65, 1, 0), zone("side", "IMAGE", "Sidebar", .65, 0, .35, 1, 1)];
  else if (preset === "50_50") base.zones = [zone("left", "IMAGE", "Left zone", 0, 0, .5, 1, 0), zone("right", "IMAGE", "Right zone", .5, 0, .5, 1, 1)];
  else if (preset === "MAIN_SIDEBAR") base.zones = [zone("main", "MAIN_AD", "Main content", 0, 0, .7, 1, 0), zone("sidebar-top", "TEXT", "Information", .7, 0, .3, .5, 1), zone("sidebar-bottom", "IMAGE", "Secondary content", .7, .5, .3, .5, 2)];
  else if (preset === "GRID") base.zones = [zone("grid-1", "IMAGE", "Zone 1", 0, 0, .5, .5, 0), zone("grid-2", "IMAGE", "Zone 2", .5, 0, .5, .5, 1), zone("grid-3", "TEXT", "Zone 3", 0, .5, .5, .5, 2), zone("grid-4", "CLOCK", "Zone 4", .5, .5, .5, .5, 3)];
  else base.zones = [];
  return base;
}

export function LayoutStudio({ canEdit, canPublish }: { canEdit: boolean; canPublish: boolean }) {
  const [mode, setMode] = useState<"HOME" | "STANDARD" | "CUSTOM">("HOME");
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [catalog, setCatalog] = useState<ContentCatalog>({ creatives: [], destinations: [] });
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [rowVersion, setRowVersion] = useState(1);
  const [workflowState, setWorkflowState] = useState("DRAFT");
  const [versions, setVersions] = useState<SavedLayout["revisions"]>([]);
  const [name, setName] = useState("Untitled OORO layout");
  const [draft, setDraft] = useState<LayoutDraft>(standardV3Draft());
  const [selectedId, setSelectedId] = useState<string | null>("standard-1");
  const [tab, setTab] = useState("Layouts");
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<Array<{ code: string; message: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [undoStack, setUndoStack] = useState<LayoutDraft[]>([]);
  const [redoStack, setRedoStack] = useState<LayoutDraft[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActivePointerGesture | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const selected = draft.zones.find(zone => zone.id === selectedId) ?? null;
  const locked = mode === "STANDARD";

  const loadLayouts = useCallback(async () => {
    try { const response = await fetch("/api/admin/layout-studio", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Unable to load layouts."); setLayouts(payload.data?.layouts ?? []); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Layout service unavailable."); }
  }, []);
  useEffect(() => { void loadLayouts(); }, [loadLayouts]);
  useEffect(() => { if (mode === "HOME") return; void fetch("/api/admin/layout-studio/content", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(payload => setCatalog(payload?.data ?? { creatives: [], destinations: [] })).catch(() => setCatalog({ creatives: [], destinations: [] })); }, [mode]);
  useEffect(() => {
    const guardBeforeUnload = (event: BeforeUnloadEvent) => { if (!dirtyRef.current) return; event.preventDefault(); event.returnValue = ""; };
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    const guardNavigation = (event: Event) => {
      const navEvent = event as Event & { canIntercept?: boolean; destination?: { url?: string } };
      if (!dirtyRef.current || !navEvent.canIntercept || !navEvent.destination?.url) return;
      const destination = new URL(navEvent.destination.url);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      if (!window.confirm("Discard unsaved layout changes?")) { event.preventDefault(); return; }
      dirtyRef.current = false;
      setDirty(false);
    };
    const guardLinkFallback = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      if (!window.confirm("Discard unsaved layout changes?")) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      dirtyRef.current = false;
      setDirty(false);
    };
    window.addEventListener("beforeunload", guardBeforeUnload);
    if (navigation) navigation.addEventListener("navigate", guardNavigation);
    else document.addEventListener("click", guardLinkFallback, true);
    return () => {
      window.removeEventListener("beforeunload", guardBeforeUnload);
      if (navigation) navigation.removeEventListener("navigate", guardNavigation);
      else document.removeEventListener("click", guardLinkFallback, true);
    };
  }, []);

  useEffect(() => () => { if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current); }, []);

  function changeDraft(next: LayoutDraft, recordHistory = true) { if (recordHistory) setUndoStack(stack => [...stack.slice(-39), deepCopy(draft)]); setRedoStack([]); setDraft(next); setDirty(true); }
  function chooseMode(next: "STANDARD" | "CUSTOM") {
    if (dirty && !window.confirm("Discard unsaved layout changes?")) return;
    setMode(next); setLayoutId(null); setRowVersion(1); setWorkflowState("DRAFT"); setVersions([]); setIssues([]); setMessage(""); setUndoStack([]); setRedoStack([]); setDirty(false);
    setTab(next === "CUSTOM" ? "Templates" : "Layouts");
    setDraft(next === "STANDARD" ? standardV3Draft() : presetDraft("CUSTOM_CANVAS")); setName(next === "STANDARD" ? "OORO Standard V3" : "Untitled OORO layout"); setSelectedId(next === "STANDARD" ? "standard-1" : null);
  }
  async function openLayout(layout: SavedLayout) {
    if (dirty && !window.confirm("Discard unsaved layout changes?")) return;
    try { const response = await fetch(`/api/admin/layout-studio/${layout.id}`, { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Unable to load layout history."); const full = payload.data as SavedLayout; setVersions(full.revisions ?? []); setLayoutId(full.id); setName(full.name); setRowVersion(full.rowVersion); setWorkflowState(full.state); setDraft(deepCopy(full.draftContract)); setMode(full.mode === "STANDARD" ? "STANDARD" : "CUSTOM"); setSelectedId(full.draftContract.zones[0]?.id ?? null); setDirty(false); setIssues([]); setUndoStack([]); setRedoStack([]); setMessage(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load layout."); }
  }
  async function save() {
    if (!canEdit || mode === "HOME" || locked) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(layoutId ? `/api/admin/layout-studio/${layoutId}/draft` : "/api/admin/layout-studio", { method: layoutId ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(layoutId ? { expectedRowVersion: rowVersion, name, contract: draft } : { name, contract: draft }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Draft save failed.");
      const saved = payload.data as SavedLayout; setLayoutId(saved.id); setRowVersion(saved.rowVersion); setWorkflowState(saved.state); setDirty(false); setIssues([]); setMessage("Draft saved securely."); await loadLayouts();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Draft save failed."); }
    finally { setBusy(false); }
  }
  async function validate() {
    if (!layoutId) { setIssues([{ code: "SAVE_FIRST", message: "Save this draft before server validation." }]); return; }
    setBusy(true); try { const response = await fetch(`/api/admin/layout-studio/${layoutId}/validate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRowVersion: rowVersion }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Validation failed."); const reportedIssues = (payload.data.issues ?? []) as Array<{ code: string; message: string }>; const layoutIssues = reportedIssues.filter(issue => issue.code !== "CAPABILITY_PROFILE_UNVERIFIED"); const needsCertification = reportedIssues.some(issue => issue.code === "CAPABILITY_PROFILE_UNVERIFIED"); setIssues(layoutIssues); if (payload.data.valid) { setRowVersion(payload.data.rowVersion); setWorkflowState(payload.data.state); } setMessage(needsCertification ? (layoutIssues.length ? "Fix the listed layout issues. Publishing also requires device capability certification." : `Draft geometry checked. ${draft.profileId} is not certified for publication; you can save and edit this layout, but cannot publish it to screens.`) : payload.data.valid ? "Layout validated. Media authorization remains separate." : "Resolve the listed validation issues."); } catch (error) { setMessage(error instanceof Error ? error.message : "Validation failed."); } finally { setBusy(false); }
  }
  async function publish() {
    if (!canPublish || !layoutId || dirty || issues.length || workflowState !== "VALIDATED") { setMessage("Save and validate this draft before Super Admin publication."); return; }
    if (!window.confirm("Approve and publish an immutable layout revision? This will not assign it to any screen.")) return;
    setBusy(true); try { const response = await fetch(`/api/admin/layout-studio/${layoutId}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRowVersion: rowVersion }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Publish failed."); setMessage(`Published immutable revision ${payload.data.revision}. No screens were changed.`); setWorkflowState("PUBLISHED"); setRowVersion(rowVersion + 1); await loadLayouts(); } catch (error) { setMessage(error instanceof Error ? error.message : "Publish failed."); } finally { setBusy(false); }
  }
  async function restoreVersion(revisionId: string) {
    if (!canPublish || !layoutId || dirty || !window.confirm("Restore this immutable version as a new draft? No screen assignment will change.")) return;
    setBusy(true); try { const response = await fetch(`/api/admin/layout-studio/${layoutId}/rollback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRowVersion: rowVersion, revisionId }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Restore failed."); const restored = payload.data as SavedLayout; setRowVersion(restored.rowVersion); setWorkflowState("DRAFT"); setDraft(deepCopy(restored.draftContract)); setSelectedId(restored.draftContract.zones[0]?.id ?? null); setDirty(false); setIssues([]); setMessage("Restored as a new draft. Existing published revisions remain unchanged."); await openLayout({ ...restored, revisions: versions }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed."); } finally { setBusy(false); }
  }
  async function archiveLayout() {
    if (!canPublish || !layoutId || dirty || !window.confirm("Archive this layout? Existing assignments, if any, must be revoked first.")) return;
    setBusy(true); try { const response = await fetch(`/api/admin/layout-studio/${layoutId}/archive`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRowVersion: rowVersion }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error?.message || "Archive failed."); setWorkflowState("ARCHIVED"); setRowVersion(payload.data.rowVersion); setMessage("Layout archived; no screen assignments were changed."); await loadLayouts(); } catch (error) { setMessage(error instanceof Error ? error.message : "Archive failed."); } finally { setBusy(false); }
  }
  function addWidget(type: WidgetType) { if (locked || !canEdit || draft.zones.length >= 24) return; const zone = newZone(type, draft.zones.length); changeDraft({ ...draft, zones: [...draft.zones, zone] }); setSelectedId(zone.id); }
  function beginDrag(event: React.PointerEvent, zone: LayoutZone, kind: "move" | "resize") {
    if (locked || !canEdit || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault(); event.stopPropagation(); setSelectedId(zone.id);
    const zoneElement = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-layout-zone]");
    if (!zoneElement) return;
    zoneElement.focus({ preventScroll: true });
    dragRef.current = { id: zone.id, kind, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, geometry: { ...zone.geometry }, latestGeometry: { ...zone.geometry }, pendingGeometry: null, element: zoneElement, started: false, beforeDraft: deepCopy(draft), beforeDirty: dirtyRef.current };
    try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* The gesture can still proceed through bubbled stage events. */ }
  }
  function applyPendingPointerGeometry() {
    const drag = dragRef.current;
    if (!drag?.pendingGeometry) return;
    const geometry = drag.pendingGeometry;
    drag.pendingGeometry = null;
    applyZoneGeometryStyle(drag.element, geometry);
  }
  function movePointer(event: React.PointerEvent) {
    const drag = dragRef.current; const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || event.pointerId !== drag.pointerId || !rect) return;
    if (!drag.started && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 3) return;
    drag.started = true;
    const delta = pointerDeltaToLayoutUnits(event.clientX - drag.startX, event.clientY - drag.startY, rect.width, rect.height);
    const geometry = drag.kind === "move" ? moveLayoutZoneGeometry(drag.geometry, delta.x, delta.y) : resizeLayoutZoneGeometry(drag.geometry, delta.x, delta.y);
    drag.latestGeometry = geometry; drag.pendingGeometry = geometry;
    if (dragFrameRef.current === null) dragFrameRef.current = window.requestAnimationFrame(() => { dragFrameRef.current = null; applyPendingPointerGeometry(); });
  }
  function endPointer(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (dragFrameRef.current !== null) { window.cancelAnimationFrame(dragFrameRef.current); dragFrameRef.current = null; }
    applyPendingPointerGeometry();
    if (!sameGeometry(drag.geometry, drag.latestGeometry)) {
      setUndoStack(stack => [...stack.slice(-39), drag.beforeDraft]); setRedoStack([]);
      setDraft(previous => ({ ...previous, zones: previous.zones.map(zone => zone.id === drag.id ? { ...zone, geometry: drag.latestGeometry } : zone) }));
      setDirty(true);
    }
    dragRef.current = null;
  }
  function cancelPointer() {
    const drag = dragRef.current;
    if (!drag) return;
    if (dragFrameRef.current !== null) { window.cancelAnimationFrame(dragFrameRef.current); dragFrameRef.current = null; }
    dragRef.current = null; applyZoneGeometryStyle(drag.element, drag.geometry); setDirty(drag.beforeDirty);
  }
  const undo = useCallback(() => { const previous = undoStack.at(-1); if (!previous) return; setRedoStack(stack => [...stack, deepCopy(draft)]); setDraft(previous); setUndoStack(stack => stack.slice(0, -1)); setDirty(true); }, [undoStack, draft]);
  const redo = useCallback(() => { const next = redoStack.at(-1); if (!next) return; setUndoStack(stack => [...stack, deepCopy(draft)]); setDraft(next); setRedoStack(stack => stack.slice(0, -1)); setDirty(true); }, [redoStack, draft]);

  useEffect(() => {
    if (mode !== "CUSTOM" || !canEdit) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.key === "Escape") {
        if (dragRef.current) { event.preventDefault(); cancelPointer(); }
        else if (selectedId) { event.preventDefault(); setSelectedId(null); }
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if (key === "y") { event.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, canEdit, undoStack, redoStack, draft, selectedId, undo, redo]);

  function handleZoneKeyDown(event: React.KeyboardEvent, zone: LayoutZone) {
    if (locked || !canEdit || selectedId !== zone.id || isEditableTarget(event.target)) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      changeDraft({ ...draft, zones: draft.zones.filter(item => item.id !== zone.id) }, !event.repeat);
      setSelectedId(null);
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const geometry = keyboardMoveLayoutZoneGeometry(zone.geometry, event.key as "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", event.shiftKey);
    if (sameGeometry(zone.geometry, geometry)) return;
    changeDraft({ ...draft, zones: draft.zones.map(item => item.id === zone.id ? { ...item, geometry } : item) }, !event.repeat);
  }

  const frame = "rounded-xl border border-white/10 bg-[#111513]";
  if (mode === "HOME") return <main className="space-y-8 text-neutral-100">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[11px] font-semibold uppercase tracking-[.24em] text-[#dfff00]">Screens / Layout Studio</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Design the screen experience.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-400">Presentation contracts stay separate from campaign approval, media eligibility and proof attribution.</p></div><div className="flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-200/[.06] px-3 py-2 text-xs text-amber-200"><ShieldCheck size={14}/>Live screen assignment is disabled</div></header>
    <section className="grid gap-4 xl:grid-cols-2"><button onClick={() => chooseMode("STANDARD")} className={`${frame} group p-6 text-left transition hover:border-[#dfff00]/50`}><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#dfff00] text-black"><Monitor size={21}/></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400">Locked geometry</span></div><h2 className="mt-6 text-xl font-semibold">OORO Standard</h2><p className="mt-2 max-w-md text-sm leading-6 text-neutral-400">Optimized layouts for everyday auto advertising. V3 geometry is fixed, lightweight and compatibility-aware.</p><div className="mt-6 grid grid-cols-4 gap-1.5 overflow-hidden rounded-lg border border-white/10 bg-black p-2"><div className="col-span-3 row-span-2 grid grid-rows-[5fr_1fr] gap-1"><span className="rounded bg-[#333a2b]"/><span className="rounded bg-[#62684e]"/></div><span className="rounded bg-[#43483c]"/><span className="rounded bg-[#202522]"/></div><p className="mt-4 text-xs text-neutral-500">1280×720 · 80/20 columns · main + sponsor · QR + navigation</p></button>
      <button onClick={() => chooseMode("CUSTOM")} className={`${frame} group p-6 text-left transition hover:border-[#dfff00]/50`}><div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.05] text-[#dfff00]"><WandSparkles size={21}/></div><span className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-400">Draft only</span></div><h2 className="mt-6 text-xl font-semibold">OORO Custom</h2><p className="mt-2 max-w-md text-sm leading-6 text-neutral-400">Design flexible digital experiences for premium, retail, event and approved display installations.</p><div className="mt-6 grid aspect-[16/5] grid-cols-3 grid-rows-2 gap-1.5 rounded-lg border border-white/10 bg-black p-2"><span className="row-span-2 rounded bg-[#333a2b]"/><span className="rounded bg-[#43483c]"/><span className="rounded bg-[#202522]"/><span className="col-span-2 rounded bg-[#62684e]"/></div><p className="mt-4 text-xs text-neutral-500">Normalized geometry · capability checks · revision history</p></button></section>
    <section className={`${frame} p-5`}><div className="flex items-center justify-between"><div><h2 className="font-medium">Saved layouts</h2><p className="mt-1 text-xs text-neutral-500">Drafts and immutable published revisions.</p></div><span className="text-xs text-neutral-500">{layouts.length} layouts</span></div>{layouts.length ? <div className="mt-4 divide-y divide-white/[.07]">{layouts.map(layout => <button key={layout.id} onClick={() => void openLayout(layout)} className="flex w-full items-center gap-4 py-3 text-left hover:bg-white/[.025]"><Layers2 size={16} className="text-[#dfff00]"/><span className="min-w-0 flex-1 truncate text-sm">{layout.name}</span><span className="text-xs text-neutral-500">{layout.mode} · {layout.state}</span><span className="text-xs text-neutral-600">r{layout.rowVersion}</span></button>)}</div> : <p className="mt-5 border-t border-white/[.07] pt-5 text-sm text-neutral-500">No saved layouts yet. Start with Standard V3 preview or create a Custom draft.</p>}</section>
  </main>;

  return <main className="-mx-4 -my-7 flex min-h-[calc(100vh-68px)] flex-col bg-[#0b0e0d] text-neutral-100 sm:-mx-7 sm:-my-9 lg:-mx-10 lg:-my-10">
    <div className="flex min-h-[68px] flex-wrap items-center gap-3 border-b border-white/[.08] px-4 py-3 lg:px-6"><button aria-label="Back to Layout Studio" onClick={() => { if (!dirty || window.confirm("Discard unsaved changes?")) { setMode("HOME"); setDirty(false); void loadLayouts(); } }} className="rounded-lg border border-white/10 p-2 text-neutral-400 hover:text-white"><ArrowLeft size={17}/></button><div className="min-w-[180px] flex-1"><input aria-label="Layout name" disabled={locked || !canEdit || workflowState === "ARCHIVED"} value={name} onChange={event => { setName(event.target.value); setDirty(true); }} className="w-full bg-transparent text-sm font-semibold outline-none disabled:text-neutral-300"/><div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500"><span>{mode === "STANDARD" ? "OORO Standard" : "OORO Custom"}</span><span>·</span><span>{draft.target.width} × {draft.target.height}</span><span>·</span><span>{draft.profileId.replaceAll("_", " ")}</span></div></div><div className="hidden items-center gap-2 md:flex"><button aria-label="Undo" disabled={!undoStack.length || locked} onClick={undo} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><Undo2 size={16}/></button><button aria-label="Redo" disabled={!redoStack.length || locked} onClick={redo} className="rounded-lg border border-white/10 p-2 disabled:opacity-30"><Redo2 size={16}/></button><button onClick={() => setZoom(value => Math.max(.65, value - .1))} className="rounded-lg border border-white/10 px-2.5 py-2 text-xs">−</button><span className="w-10 text-center text-xs text-neutral-400">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(value => Math.min(1.25, value + .1))} className="rounded-lg border border-white/10 px-2.5 py-2 text-xs">+</button></div><span className={`hidden items-center gap-1.5 text-xs sm:flex ${dirty ? "text-amber-200" : "text-neutral-500"}`}><Cloud size={14}/>{dirty ? "Unsaved changes" : "All changes saved"}</span><button disabled={!canEdit || locked || busy || workflowState === "ARCHIVED"} onClick={() => void save()} className="flex items-center gap-2 rounded-lg bg-[#dfff00] px-3.5 py-2.5 text-xs font-semibold text-black disabled:opacity-40"><Save size={14}/>{busy ? "Working…" : "Save draft"}</button><button disabled={!layoutId || dirty || busy || workflowState === "ARCHIVED"} onClick={() => void validate()} className="rounded-lg border border-white/15 px-3.5 py-2.5 text-xs disabled:opacity-40">{mode === "CUSTOM" ? "Check draft" : "Validate"}</button><button disabled={!canPublish || mode === "CUSTOM" || !layoutId || dirty || busy || workflowState !== "VALIDATED"} onClick={() => void publish()} title={mode === "CUSTOM" ? "Custom layout publishing requires certified runtime capabilities and resource budgets" : canPublish ? "Approve and publish an immutable revision" : "Only Super Admin can publish"} className="rounded-lg border border-[#dfff00]/50 px-3.5 py-2.5 text-xs text-[#dfff00] disabled:opacity-40">Publish</button></div>
    {mode === "CUSTOM" && <div role="status" className="border-b border-amber-200/20 bg-amber-200/[.05] px-5 py-3 text-xs leading-5 text-amber-100">Custom layouts are <strong>draft only</strong> until the selected device profile is certified for rendering, resource usage and playback. “Check draft” reviews geometry and content bindings; it cannot certify a device or enable publishing. Use the supported Standard V3 layout for the existing renderer.</div>}
    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[218px_minmax(0,1fr)_270px]">
      <aside className="border-b border-white/[.08] lg:border-b-0 lg:border-r"><div className="flex gap-1 overflow-x-auto p-3 lg:flex-col">{["Layouts", "Widgets", "Backgrounds", "Media", "Templates"].map(item => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-3 py-2 text-left text-xs ${tab === item ? "bg-white/[.09] text-white" : "text-neutral-500 hover:text-white"}`}>{item}</button>)}</div><div className="border-t border-white/[.07] p-3"><p className="mb-3 text-[10px] font-semibold uppercase tracking-[.16em] text-neutral-500">{tab === "Widgets" ? "Supported widgets" : tab === "Templates" ? "Starting templates" : tab === "Layouts" ? "Saved layouts" : tab}</p>{tab === "Widgets" ? <div className="space-y-1.5">{widgets.map(widget => <button disabled={locked || !canEdit || draft.zones.length >= 24} title={draft.zones.length >= 24 ? "A layout can contain at most 24 zones." : undefined} key={widget.type} onClick={() => addWidget(widget.type)} className="flex w-full items-start gap-2 rounded-lg border border-white/[.06] p-2.5 text-left hover:border-white/20 disabled:opacity-40"><Plus size={13} className="mt-0.5 shrink-0 text-[#dfff00]"/><span><span className="block text-xs">{widget.label}</span><span className="mt-1 block text-[10px] leading-4 text-neutral-500">{widget.detail}</span></span></button>)}</div> : tab === "Templates" ? <div className="space-y-1">{presets.map(preset => <button key={preset} disabled={locked || !canEdit} onClick={() => { const next = presetDraft(preset); changeDraft(next); setSelectedId(next.zones[0]?.id ?? null); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-neutral-300 hover:bg-white/[.05] disabled:opacity-40"><Grid2X2 size={13} className="text-neutral-500"/>{preset.replaceAll("_", " ")}</button>)}</div> : tab === "Layouts" ? <div className="space-y-1">{layouts.map(layout => <button key={layout.id} onClick={() => void openLayout(layout)} className="w-full truncate rounded-lg px-2 py-2 text-left text-xs text-neutral-300 hover:bg-white/[.05]">{layout.name}</button>)}{layouts.length === 0 && <p className="px-2 text-xs leading-5 text-neutral-600">Saved drafts appear here.</p>}</div> : <p className="text-xs leading-5 text-neutral-600">{tab === "Media" ? "Media bindings reference existing approved creative records. Upload and approval remain in the campaign workflow." : tab === "Backgrounds" ? "Choose approved static background assets from the media library in a later integration step." : "Background and media catalog connection is not enabled in this release."}</p>}</div></aside>
      <section className="flex min-h-[440px] min-w-0 flex-col bg-[#111513] p-4 lg:p-6"><div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[.14em] text-neutral-500"><span className="flex items-center gap-2"><MousePointer2 size={13}/>Canvas · snap 1% · arrows move 0.5%, Shift+arrows 2%</span><span>Preview only · no impressions or proof events</span></div><div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border border-white/[.06] bg-[radial-gradient(#353a36_0.6px,transparent_0.6px)] [background-size:12px_12px] p-5"><div ref={stageRef} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={cancelPointer} data-testid="layout-canvas" className="relative aspect-video w-full max-w-[920px] overflow-hidden border border-white/30 bg-[#090b0a] shadow-[0_18px_70px_rgba(0,0,0,.42)]" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
        {mode === "STANDARD" ? <><div data-testid="standard-main-zone" className="absolute border-r border-white/40 bg-[#20251e]" style={{ left: "0%", top: "0%", width: "80%", height: "85%" }}><span className="absolute inset-0 grid place-items-center text-[clamp(10px,1.3vw,15px)] font-semibold tracking-wide text-neutral-300">MAIN AD · 1024 × 612</span></div><div data-testid="standard-sponsor-zone" className="absolute border-r border-t border-white/40 bg-[#30352b]" style={{ left: 0, top: "85%", width: "80%", height: "15%" }}><span className="grid h-full place-items-center text-[clamp(8px,1vw,12px)] text-neutral-300">SPONSORED · 1024 × 108</span></div><div data-testid="standard-qr-zone" className="absolute grid place-items-center border-b border-white/30 bg-[#1b201c] text-center text-[clamp(8px,1vw,12px)] text-neutral-300" style={{ left: "80%", top: 0, width: "20%", height: "50%" }}>QR / OFFER<br/>256 × 360</div><div data-testid="standard-navigation-zone" className="absolute grid place-items-center bg-[#151a18] text-center text-[clamp(8px,1vw,12px)] text-neutral-400" style={{ left: "80%", top: "50%", width: "20%", height: "50%" }}>NAVIGATION<br/>256 × 360</div><div className="pointer-events-none absolute inset-0 border border-[#dfff00]/20"/></> : draft.zones.filter(zone => zone.visible).map(zone => <div key={zone.id} data-layout-zone data-zone-id={zone.id} role="group" tabIndex={canEdit ? 0 : -1} aria-label={`${zone.label} layout zone controls`} aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown Delete Escape" aria-disabled={locked || !canEdit} onPointerDown={event => beginDrag(event, zone, "move")} onFocus={() => setSelectedId(zone.id)} onKeyDown={event => handleZoneKeyDown(event, zone)} className={`absolute touch-none select-none overflow-hidden border text-[clamp(8px,1vw,13px)] font-medium outline-none ${selectedId === zone.id ? "border-[#dfff00] bg-[#a6bf19]/20 text-white ring-1 ring-[#dfff00]/60" : "border-white/35 bg-white/[.06] text-neutral-300 hover:border-white/70"}`} style={{ left: `${zone.geometry.x * 100}%`, top: `${zone.geometry.y * 100}%`, width: `${zone.geometry.width * 100}%`, height: `${zone.geometry.height * 100}%`, zIndex: zone.zIndex + 1 }}><span className="pointer-events-none flex h-full items-center justify-center px-2 text-center">{zone.label}</span>{selectedId === zone.id && <button type="button" aria-label={`Resize ${zone.label}`} aria-disabled={locked || !canEdit} disabled={locked || !canEdit} onPointerDown={event => beginDrag(event, zone, "resize")} className="absolute bottom-0 right-0 h-6 w-6 cursor-nwse-resize border-l border-t border-[#dfff00] bg-black/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#dfff00]"><Maximize2 size={9}/></button>}</div>)}
      </div></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] text-neutral-500"><span className="rounded border border-white/10 px-2 py-1">{draft.target.width} × {draft.target.height}</span><span>Normalized coordinates preserve screen aspect ratio.</span></div><select aria-label="Target device profile" disabled={locked || !canEdit} value={draft.profileId} onChange={event => changeDraft({ ...draft, profileId: event.target.value as LayoutDraft["profileId"] })} className="rounded-lg border border-white/10 bg-[#171a18] px-2.5 py-2 text-xs text-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"><option value="OORO_AUTO_LITE">OORO Auto Lite</option><option value="OORO_PREMIUM">OORO Premium</option><option value="OORO_RETAIL_EVENT">OORO Retail / Event</option></select></div></section>
      <aside className="border-t border-white/[.08] lg:border-l lg:border-t-0"><div className="p-4"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.15em] text-neutral-400">Properties</h2><ChevronDown size={14} className="text-neutral-600"/></div>{selected ? <div className="mt-5 space-y-4"><div><label className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">Selected zone</label><input disabled={locked || !canEdit} value={selected.label} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, label: event.target.value } : zone) })} className="w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs disabled:text-neutral-400"/></div><div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height"] as const).map(key => <label key={key} className="text-[10px] uppercase tracking-wider text-neutral-500">{key}<input type="number" min={0} max={1} step={.01} disabled={locked || !canEdit} value={Number(selected.geometry[key].toFixed(2))} onChange={event => { const value = Number(event.target.value); changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, geometry: { ...zone.geometry, [key]: value } } : zone) }); }} className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#111513] px-2.5 py-2 text-xs text-white disabled:text-neutral-500"/></label>)}</div><div><label className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">Widget type</label><select disabled={locked || !canEdit} value={selected.type} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, type: event.target.value as WidgetType } : zone) })} className="w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs"><option value={selected.type}>{selected.type.replaceAll("_", " ")}</option>{widgets.filter(widget => widget.type !== selected.type).map(widget => <option key={widget.type} value={widget.type}>{widget.label}</option>)}</select></div><div><label className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">Media fitting</label><select disabled={locked || !canEdit} value={selected.fit} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, fit: event.target.value as LayoutZone["fit"] } : zone) })} className="w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs"><option value="FIT">FIT · contain</option><option value="CENTER_CROP">Center crop · explicit</option></select></div><div><label className="mb-1.5 block text-[10px] uppercase tracking-wider text-neutral-500">Content binding</label><select disabled={locked || !canEdit} value={selected.contentBinding.kind} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, contentBinding: { kind: event.target.value as LayoutZone["contentBinding"]["kind"] } } : zone) })} className="w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs"><option value="NONE">Unbound preview</option><option value="APPROVED_CREATIVE">Existing approved creative</option><option value="APPROVED_SPONSOR">Existing approved sponsor</option><option value="AUTHORIZED_DESTINATION">Authorized destination</option></select>{selected.contentBinding.kind === "APPROVED_CREATIVE" || selected.contentBinding.kind === "APPROVED_SPONSOR" ? <select aria-label="Approved creative binding" disabled={locked || !canEdit} value={selected.contentBinding.referenceId ?? ""} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, contentBinding: { ...zone.contentBinding, referenceId: event.target.value || undefined } } : zone) })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs"><option value="">Select approved media…</option>{catalog.creatives.filter(creative => selected.contentBinding.kind === "APPROVED_SPONSOR" ? creative.campaign.deliverySlot === "SPONSORED" && creative.type.toUpperCase() === "IMAGE" : creative.campaign.deliverySlot !== "SPONSORED").map(creative => <option key={creative.id} value={creative.id}>{creative.campaign.name} · {creative.name}</option>)}</select> : selected.contentBinding.kind === "AUTHORIZED_DESTINATION" ? <select aria-label="Authorized destination binding" disabled={locked || !canEdit} value={selected.contentBinding.referenceId ?? ""} onChange={event => changeDraft({ ...draft, zones: draft.zones.map(zone => zone.id === selected.id ? { ...zone, contentBinding: { ...zone.contentBinding, referenceId: event.target.value || undefined } } : zone) })} className="mt-2 w-full rounded-lg border border-white/10 bg-[#111513] px-3 py-2 text-xs"><option value="">Select an active destination…</option>{catalog.destinations.map(destination => <option key={destination.id} value={destination.id}>{destination.campaign.name} · {destination.ctaType}</option>)}</select> : null}<p className="mt-1.5 text-[10px] leading-4 text-neutral-600">The selected reference does not change campaign schedule, screen eligibility or proof authorization.</p></div><div className="rounded-lg border border-white/[.07] bg-white/[.025] p-3"><div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-neutral-500"><Sparkles size={12}/>Resource estimate</div><p className="mt-2 text-xs text-neutral-300">{["VIDEO", "NAVIGATION_MAP", "WEATHER", "BACKGROUND_IMAGE"].includes(selected.type) ? "Elevated — capability gated" : "Lightweight — static rendering"}</p></div></div> : <div className="mt-8 text-center text-xs text-neutral-600"><Copy size={18} className="mx-auto mb-2 opacity-50"/>Select a zone to inspect its properties.</div>}
        <div className="mt-6 border-t border-white/[.08] pt-4"><h3 className="text-[10px] font-semibold uppercase tracking-[.15em] text-neutral-500">Compatibility</h3><p className="mt-2 text-xs leading-5 text-neutral-400">{mode === "CUSTOM" ? "This hardware profile is not certified for the custom renderer. Draft and preview are available; validation and publication wait for measured capability limits." : "OORO Standard V3 uses the existing supported geometry. Live assignments remain disabled in this release."}</p><div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/10 bg-amber-200/[.04] p-2.5 text-[10px] leading-4 text-amber-100/80"><CircleAlert size={13} className="mt-0.5 shrink-0"/>Preview widgets never create campaign impressions or proof events.</div>{versions?.length ? <div className="mt-5 border-t border-white/[.08] pt-4"><h3 className="text-[10px] font-semibold uppercase tracking-[.15em] text-neutral-500">Published versions</h3><div className="mt-2 space-y-2">{versions.map(version => <div key={version.id} className="flex items-center gap-2 rounded-lg bg-white/[.025] p-2"><span className="min-w-0 flex-1"><span className="block text-xs">Revision {version.revision}</span><span className="block text-[9px] text-neutral-600">{new Date(version.publishedAt).toLocaleDateString()}</span></span><button disabled={!canPublish || dirty || busy || workflowState === "ARCHIVED"} onClick={() => void restoreVersion(version.id)} className="rounded border border-white/10 px-2 py-1 text-[9px] text-neutral-300 disabled:opacity-40">Restore draft</button></div>)}</div></div> : null}{canPublish && layoutId && workflowState !== "ARCHIVED" ? <button disabled={dirty || busy} onClick={() => void archiveLayout()} className="mt-4 w-full rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-200 disabled:opacity-40">Archive layout</button> : null}</div>
      </div></aside>
    </div>
    {(message || issues.length > 0) && <div aria-live="polite" className="border-t border-white/[.08] bg-[#111513] px-5 py-3 text-xs"><p className={issues.length ? "text-amber-200" : "text-neutral-300"}>{message}</p>{issues.map(issue => <p key={`${issue.code}-${issue.message}`} className="mt-1 text-amber-200">{issue.code}: {issue.message}</p>)}</div>}
  </main>;
}
