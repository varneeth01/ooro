"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, MapPin, MonitorPlay, Radio, RefreshCw, Upload } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/app-ui";
import { AdminSubnav, ConnectivityStatus, LiveCreativePreview, RelativeTime } from "@/components/admin/admin-ui";
import { screenRepository } from "@/lib/admin/repositories";
import type { Screen } from "@/lib/admin/types";
type Proof = {id:string;campaignId:string;creativeId:string;displayId:string;playbackStartedAt:string;expectedDuration:number;actualDuration:number|null;status:string;invalidReason:string|null;display:{name:string}};
type OverviewData = { total:number; online:number; offline:number; playing:number; idle:number; errors:number; activeCampaigns:number; scheduledCampaigns:number; pendingCampaigns:number; pendingCreatives:number; playsToday:number; manifestFailures:number };
export function OperationsOverview({canViewFleet=true,canViewCampaigns=true,canSchedule=true}:{canViewFleet?:boolean;canViewCampaigns?:boolean;canSchedule?:boolean}){
 const [data,setData]=useState<OverviewData|null>(null),[screens,setScreens]=useState<Screen[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[clock,setClock]=useState(()=>Date.now());
 const load=useCallback(async()=>{setError('');setLoading(true);try{const overviewRequest=fetch('/api/admin/overview',{cache:'no-store'});const fleetRequest=canViewFleet?screenRepository.listScreens():Promise.resolve([]);const [r,fleet]=await Promise.all([overviewRequest,fleetRequest]);const p=await r.json();if(!r.ok)throw new Error(`${p.error?.message} ${p.requestId??''}`);setData(p.data);setScreens(fleet);}catch(e){setError(e instanceof Error?e.message:'Unable to load the operations overview.');}finally{setLoading(false);}},[canViewFleet]);
 useEffect(()=>{void load();const refresh=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(refresh);},[load]);
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),30000);return()=>window.clearInterval(timer);},[]);
 const verified=(screen?:Screen)=>Boolean(screen?.connectivity==='ONLINE'&&screen.lastHeartbeatAt&&clock-new Date(screen.lastHeartbeatAt).getTime()<=120000);
 const liveScreens=screens.filter(screen=>screen.playbackState==='PLAYING'&&verified(screen));
 const featured=liveScreens[0]??screens.find(screen=>screen.connectivity==='ONLINE'&&verified(screen))??screens[0];
 const attention=(data?.offline??0)+(data?.errors??0)+(data?.manifestFailures??0)+(data?.pendingCreatives??0);
 const metrics=[
  {label:'Fleet online',value:data?`${data.online}/${data.total}`:'—',detail:data?.total?`${Math.round((data.online/data.total)*100)}% reachable`:'No screens registered'},
  {label:'Playing now',value:data?.playing??'—',detail:`${data?.activeCampaigns??0} active campaigns`},
  {label:'Verified plays today',value:data?.playsToday??'—',detail:'Device-reported · IST'},
  {label:'Needs attention',value:attention,detail:attention?'Review exceptions below':'Network looks clear'},
 ];
 const actions=(canViewCampaigns||canSchedule)&&<div className="flex flex-wrap gap-2">{canViewCampaigns&&<Link href="/admin/creatives" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium hover:border-neutral-500"><Upload size={15}/>Creative library</Link>}{canSchedule&&<Link href="/admin/operations/scheduler" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#dfff00] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-95"><Clock3 size={15}/>Schedule delivery</Link>}</div>;
 if(error)return <div className="space-y-7"><PageHeader title="Network command center" description="See what the fleet is playing now, verify delivery, and move directly into the next operational action." action={actions}/>{canViewFleet&&<AdminSubnav/>}<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center text-red-950"><CircleAlert className="mx-auto text-red-700" size={30}/><h2 className="mt-4 text-lg font-semibold">Live operations data is unavailable</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-red-800">{error}</p><button type="button" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-950 px-4 py-3 text-sm font-medium text-white" onClick={()=>void load()}><RefreshCw size={14}/>Retry dashboard</button></div></div>;
 return <div className="space-y-7">
  <PageHeader title="Network command center" description="See what the fleet is playing now, verify delivery, and move directly into the next operational action." action={actions}/>
  {canViewFleet&&<AdminSubnav/>}
  <section className="overflow-hidden rounded-2xl bg-[#0d0f0c] text-white shadow-[0_22px_60px_rgba(0,0,0,.18)]">
   <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div><div className="flex items-center gap-2 text-sm font-medium"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#dfff00] opacity-40"/><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#dfff00]"/></span>OORO live network</div><p className="mt-1 text-xs text-neutral-400">Latest authenticated screen reports</p></div><button type="button" onClick={()=>void load()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-xs text-neutral-300 hover:bg-white/10 disabled:opacity-60 sm:self-auto"><RefreshCw size={13} className={loading?'animate-spin':''}/>{loading?'Refreshing…':'Refresh live data'}</button></div>
   <div className="grid divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">{metrics.map(metric=><div key={metric.label} className="px-5 py-5 sm:px-7"><p className="text-xs text-neutral-300">{metric.label}</p><p className="mt-2 text-3xl font-semibold tracking-[-.03em] text-white tabular-nums">{loading?'…':metric.value}</p><p className="mt-1 text-xs text-neutral-300">{metric.detail}</p></div>)}</div>
  </section>
  {canViewFleet?<div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)]">
   <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
    <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-5 sm:px-7"><div><h2 className="text-lg font-semibold tracking-[-.02em]">Now playing</h2><p className="mt-1 text-sm text-neutral-500">Creative previews are assets reported by screens, not live camera streams.</p></div><Link href="/admin/screens" className="inline-flex shrink-0 items-center gap-2 text-sm font-medium hover:underline">All screens<ArrowRight size={14}/></Link></div>
    {loading?<div className="p-7"><div className="h-64 animate-pulse rounded-xl bg-neutral-100"/></div>:featured?<div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]"><div className="bg-[#181a16] p-4 sm:p-6"><LiveCreativePreview creative={{name:featured.currentCreativeName,url:featured.currentCreativeUrl,mimeType:featured.currentCreativeMimeType,fileName:featured.currentCreativeFileName}} state={featured.playbackState} verified={verified(featured)}/></div><div className="flex flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><Link href={`/admin/screens/${featured.screenId}`} className="text-lg font-semibold tracking-[-.02em] hover:underline">{featured.screenName}</Link><p className="mt-1 text-sm text-neutral-500">{featured.vehicleIdentifier||'No vehicle'} · {featured.area}, {featured.city}</p></div><ConnectivityStatus status={featured.connectivity??'NEVER_CONNECTED'}/></div><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-xs text-neutral-500">Creative</dt><dd className="mt-1 font-medium">{featured.currentCreativeName||featured.currentCreativeId||'No creative reported'}</dd></div><div><dt className="text-xs text-neutral-500">Campaign</dt><dd className="mt-1">{featured.currentCampaignName||featured.currentCampaignId||'—'}</dd></div><div><dt className="text-xs text-neutral-500">Last heartbeat</dt><dd className="mt-1"><RelativeTime value={featured.lastHeartbeatAt??undefined}/></dd></div></dl><div className="mt-auto pt-6"><Link href={`/admin/screens/${featured.screenId}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800">Inspect screen<ArrowRight size={14}/></Link></div></div></div>:<div className="px-7 py-16 text-center"><MonitorPlay className="mx-auto text-neutral-300" size={30}/><p className="mt-4 font-medium">No screens connected yet</p><p className="mt-2 text-sm text-neutral-500">Add and pair a screen to see live playback here.</p></div>}
    {screens.length>1&&<div className="border-t border-neutral-200"><div className="divide-y divide-neutral-100">{screens.filter(screen=>screen.screenId!==featured?.screenId).slice(0,4).map(screen=><Link key={screen.screenId} href={`/admin/screens/${screen.screenId}`} className="grid gap-3 px-5 py-4 hover:bg-neutral-50 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:px-7"><LiveCreativePreview compact creative={{name:screen.currentCreativeName,url:screen.currentCreativeUrl,mimeType:screen.currentCreativeMimeType,fileName:screen.currentCreativeFileName}} state={screen.playbackState} verified={verified(screen)}/><div className="min-w-0"><p className="truncate text-sm font-medium">{screen.screenName}</p><p className="mt-1 truncate text-xs text-neutral-500">{screen.currentCreativeName||screen.currentCreativeId||'No creative reported'} · {screen.area}</p></div><div className="flex items-center gap-3 sm:justify-end"><ConnectivityStatus status={screen.connectivity??'NEVER_CONNECTED'}/><ArrowRight size={14} className="text-neutral-400"/></div></Link>)}</div></div>}
   </section>
   <div className="space-y-6">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-.02em]">Needs attention</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attention?'bg-amber-100 text-amber-900':'bg-lime-100 text-lime-900'}`}>{loading?'…':attention}</span></div><div className="mt-5 divide-y divide-neutral-100">{[
      {label:'Screens offline or unseen',value:data?.offline??0,href:'/admin/screens',icon:Radio},
      {label:'Device playback errors',value:data?.errors??0,href:'/admin/device-health',icon:CircleAlert},
      {label:'Failed manifest commands',value:data?.manifestFailures??0,href:'/admin/device-health',icon:RefreshCw},
      {label:'Creatives awaiting review',value:data?.pendingCreatives??0,href:'/admin/creatives',icon:CheckCircle2},
     ].map(item=><Link href={item.href} key={item.label} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100"><item.icon size={16}/></span><span className="min-w-0 flex-1 text-sm">{item.label}</span><span className="font-semibold tabular-nums">{loading?'…':item.value}</span><ArrowRight size={14} className="text-neutral-400"/></Link>)}</div></section>
    <section className="rounded-2xl bg-[#dfff00] p-5 text-black sm:p-6"><h2 className="text-lg font-semibold tracking-[-.02em]">Operator flow</h2><ol className="mt-5 space-y-4">{[['1','Scan fleet','Find offline, stale, or unverified playback.'],['2','Inspect evidence','Open the screen, creative, heartbeat, and proof.'],['3','Act safely','Schedule, sync, review, or escalate from the same context.']].map(([step,title,detail])=><li key={step} className="grid grid-cols-[28px_1fr] gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-xs font-semibold text-white">{step}</span><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-black/65">{detail}</p></div></li>)}</ol><div className="mt-6 flex flex-wrap gap-3 text-sm font-medium"><Link href="/admin/map" className="inline-flex items-center gap-2 underline underline-offset-4"><MapPin size={14}/>Live map</Link><Link href="/admin/proof-of-play" className="inline-flex items-center gap-2 underline underline-offset-4"><MonitorPlay size={14}/>Proof of play</Link></div></section>
   </div>
  </div>:<section className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center"><MonitorPlay className="mx-auto text-neutral-300" size={30}/><h2 className="mt-4 text-lg font-semibold">Fleet details are restricted</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-neutral-500">Your role can view aggregate operations metrics. Screen-level creative, location, and device controls require fleet access.</p></section>}
 </div>;
}
export function ProofReport() {
  const [items, setItems] = useState<Proof[] | null>(null);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError("");
    setItems(null);
    try {
      const response = await fetch(`/api/admin/proof-of-play?${query}${query ? "&" : ""}skip=${skip}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(`${payload.error?.message || "Proof of play could not be loaded."}${payload.requestId ? ` · Reference ${payload.requestId}` : ""}`);
      setItems(payload.data.items);
      setTotal(payload.data.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Proof of play could not be loaded.");
    }
  }, [query, skip]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSkip(0);
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      normalized[key] = ["from", "to"].includes(key) && value.includes("T") ? new Date(`${value}+05:30`).toISOString() : value;
    }
    setQuery(new URLSearchParams(normalized).toString());
  }

  function clearFilters() {
    setFilters({});
    setQuery("");
    setSkip(0);
  }

  const fields = [
    { key: "campaignId", label: "Campaign ID", placeholder: "Paste campaign ID" },
    { key: "creativeId", label: "Creative ID", placeholder: "Paste creative ID" },
    { key: "displayId", label: "Screen ID", placeholder: "Paste screen ID" },
    { key: "vehicleId", label: "Vehicle ID", placeholder: "Paste vehicle ID" },
    { key: "routeId", label: "Route ID", placeholder: "Paste route ID" },
  ];
  const input = "mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#dfff00] focus:ring-2 focus:ring-[#dfff00]/20";

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader eyebrow="Admin / Ad operations" title="Proof of play" description="See what each screen reported, when it played, and whether the creative completed successfully." />
    <AdminSubnav />
    <SectionCard title="Filter playback records" description="Use one or more IDs, a time range, or a result. Filters run on the server before records load.">
      <form onSubmit={applyFilters} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map(field => <label key={field.key} className="block text-sm font-medium text-neutral-200">{field.label}<input type="text" inputMode="text" autoComplete="off" placeholder={field.placeholder} className={input} value={filters[field.key] ?? ""} onChange={event => setFilters(current => ({ ...current, [field.key]: event.target.value }))}/></label>)}
          <label className="block text-sm font-medium text-neutral-200">From (IST)<input aria-label="From date and time, IST" type="datetime-local" className={input} value={filters.from ?? ""} onChange={event => setFilters(current => ({ ...current, from: event.target.value }))}/></label>
          <label className="block text-sm font-medium text-neutral-200">To (IST)<input aria-label="To date and time, IST" type="datetime-local" className={input} value={filters.to ?? ""} onChange={event => setFilters(current => ({ ...current, to: event.target.value }))}/></label>
          <label className="block text-sm font-medium text-neutral-200">Playback result<select className={input} value={filters.success ?? ""} onChange={event => setFilters(current => ({ ...current, success: event.target.value }))}><option value="">All results</option><option value="true">Successful</option><option value="false">Failed</option></select></label>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-sm font-medium text-neutral-400 hover:bg-white/[.05] hover:text-neutral-100">Clear filters</button><button className="min-h-11 rounded-lg bg-[var(--brand-yellow)] px-5 text-sm font-semibold text-black">Apply filters</button></div>
      </form>
    </SectionCard>

    {error ? <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200"><p>{error}</p><button type="button" onClick={() => void load()} className="shrink-0 font-semibold underline underline-offset-4">Retry</button></div> : items === null ? <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-[#191f24]" aria-label="Loading playback records"/> : <SectionCard title="Playback records" description={`${total.toLocaleString("en-IN")} recorded plays · Expected and actual durations are shown in milliseconds.`}>
      {items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-y border-neutral-200 text-xs text-neutral-500">{["Time (IST)", "Screen", "Campaign / creative", "Expected / actual", "Result", "Failure details"].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id} className="border-b border-neutral-100 align-top"><td className="whitespace-nowrap px-3 py-4 text-xs text-neutral-300">{new Date(item.playbackStartedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td><td className="px-3 py-4"><Link className="font-medium text-[#dfff00] underline underline-offset-4" href={`/admin/screens/${item.displayId}`}>{item.display.name}</Link><span className="mt-1 block font-mono text-[10px] text-neutral-500">ID · {item.displayId.slice(-8)}</span></td><td className="px-3 py-4"><Link className="font-mono text-xs text-neutral-200 underline underline-offset-4" href={`/admin/campaigns/${item.campaignId}`}>Campaign · {item.campaignId.slice(-8)}</Link><span className="mt-1 block font-mono text-[10px] text-neutral-500">Creative · {item.creativeId.slice(-8)}</span></td><td className="whitespace-nowrap px-3 py-4 tabular-nums text-neutral-200">{item.expectedDuration.toLocaleString("en-IN")} / {item.actualDuration === null ? "—" : item.actualDuration.toLocaleString("en-IN")} ms</td><td className="px-3 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "VALID" ? "bg-lime-400/10 text-lime-200" : "bg-red-400/10 text-red-200"}`}>{item.status.replaceAll("_", " ")}</span></td><td className="max-w-[240px] px-3 py-4 text-xs leading-5 text-neutral-400">{item.invalidReason || "—"}</td></tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-neutral-200 px-5 py-12 text-center"><p className="text-sm font-semibold text-neutral-200">No playback records found</p><p className="mt-1 text-xs text-neutral-500">Try widening the time range or clearing one of the filters.</p></div>}
      <div className="mt-4 flex flex-col gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-500">Showing {total === 0 ? 0 : skip + 1}–{Math.min(skip + 50, total)} of {total.toLocaleString("en-IN")}</p><div className="flex items-center gap-2"><button type="button" disabled={!skip} onClick={() => setSkip(Math.max(0, skip - 50))} className="min-h-10 rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-40">Previous</button><button type="button" disabled={skip + 50 >= total} onClick={() => setSkip(skip + 50)} className="min-h-10 rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-40">Next</button></div></div>
    </SectionCard>}
  </div>;
}
export function AuditReport(){const [items,setItems]=useState<Record<string,unknown>[]|null>(null),[skip,setSkip]=useState(0),[error,setError]=useState('');useEffect(()=>{setItems(null);setError('');void fetch(`/api/admin/audit-log?skip=${skip}`).then(async r=>{const p=await r.json();if(!r.ok)throw new Error(p.error?.message);setItems(p.data);}).catch(e=>setError(String(e)));},[skip]);return <div className="space-y-5"><PageHeader eyebrow="Admin / System" title="Audit log" description="Actor, request, and before/after state for operational changes."/>{error?<p role="alert">{error}</p>:!items?<p>Loading audit log…</p>:<>{items.map(item=><details key={String(item.id)} className="border bg-white p-4 text-sm"><summary>{String(item.createdAt)} · {String(item.action)} · {String(item.actorId??item.actorRole??'Unknown actor')}</summary><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(item,null,2)}</pre></details>)}{!items.length&&<p>No events.</p>}<div className="flex gap-4"><button disabled={!skip} onClick={()=>setSkip(Math.max(0,skip-50))}>Previous</button><button disabled={items.length<50} onClick={()=>setSkip(skip+50)}>Next</button></div></>}</div>;}
