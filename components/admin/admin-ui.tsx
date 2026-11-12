"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AlertTriangle, Check, Circle, ImageIcon, Info, Play, Radio, WifiOff } from "lucide-react";
import type { ConnectivityStatus, DeviceHealth, HealthSeverity, PairingStatus, PlayerStatus } from "@/lib/admin/types";
import { exactTime, formatBytes, percent, relativeTime } from "@/lib/admin/format";

const connectivityStyles: Record<ConnectivityStatus, string> = { ONLINE: "text-[#3f6d1d]", STALE: "text-[#9a6500]", OFFLINE: "text-red-700", NEVER_CONNECTED: "text-neutral-400" };
export function ConnectivityStatus({ status }: { status: ConnectivityStatus }) { const label = status === "NEVER_CONNECTED" ? "Never connected" : status[0] + status.slice(1).toLowerCase(); return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${connectivityStyles[status]}`}><Circle size={8} fill="currentColor" />{label}</span>; }
export function PairingBadge({ status }: { status: PairingStatus }) { const pending = status === "REMOVAL_PENDING"; return <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[.08em] ${pending ? "border-amber-200 bg-amber-50 text-amber-800" : "border-neutral-200 bg-neutral-50 text-neutral-500"}`}>{status.replaceAll("_", " ")}</span>; }
export function PlayerState({ state }: { state?: PlayerStatus }) { return <span className="text-xs font-medium text-neutral-700">{state ? state.replaceAll("_", " ") : "Waiting for heartbeat"}</span>; }
export function HealthSeverityIcon({ severity }: { severity: HealthSeverity }) { if (severity === "CRITICAL") return <AlertTriangle size={14} className="text-red-700"/>; if (severity === "WARNING") return <AlertTriangle size={14} className="text-[#a06b00]"/>; if (severity === "INFO") return <Info size={14} className="text-neutral-500"/>; return <Check size={14} className="text-[#3f6d1d]"/>; }
export function RelativeTime({ value }: { value?: string }) { return <time dateTime={value} title={exactTime(value)}>{relativeTime(value)}</time>; }
export function StorageStatus({ free, total }: { free?: number; total?: number }) { const value = percent(free, total); const tone = value !== undefined && value < 10 ? "bg-red-600" : value !== undefined && value < 20 ? "bg-[#d59b00]" : "bg-black"; return <div className="min-w-[130px]"><div className="flex items-center justify-between gap-3 text-xs"><span>{formatBytes(free)} free</span><span className="text-neutral-400">{formatBytes(total)}</span></div>{value !== undefined && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full ${tone}`} style={{ width: `${value}%` }}/></div>}</div>; }
export function HealthBanner({ mock }: { mock: boolean }) { return mock ? <div className="flex items-center gap-2 border border-[#d7e694] bg-[#f5facf] px-3 py-2 text-xs text-neutral-700"><Info size={14}/> Development mock device data is enabled. It is not live monitoring.</div> : null; }
export function EmptyHealth({ title = "Waiting for first heartbeat." }: { title?: string }) { return <div className="border border-dashed border-neutral-300 bg-[#fafaf8] px-5 py-10 text-center text-sm text-neutral-500">{title}</div>; }
export function HealthIssueList({ health }: { health: DeviceHealth | null }) { if (!health?.issues.length) return <div className="flex items-center gap-2 text-sm text-[#3f6d1d]"><Check size={15}/> No derived issues</div>; return <div className="space-y-3">{health.issues.map(issue => <div className="flex gap-3" key={issue.code}><HealthSeverityIcon severity={issue.severity}/><div><p className="text-sm font-medium">{issue.label}</p><p className="mt-0.5 text-xs text-neutral-500">{issue.detail}</p></div></div>)}</div>; }
export function OfflinePlaybackNote({ health }: { health: DeviceHealth | null }) { if (health?.connectivity !== "OFFLINE" || health.playerState !== "OFFLINE_PLAYBACK") return null; return <div className="flex items-start gap-2 border border-[#d7e694] bg-[#f8fbdc] p-3 text-xs leading-5 text-neutral-700"><WifiOff size={14} className="mt-0.5 shrink-0"/>Offline connectivity is not playback failure. This screen is playing cached content locally.</div>; }
type LiveCreative = { name?: string | null; url?: string | null; mimeType?: string | null; fileName?: string | null };
export function LiveCreativePreview({ creative, state, verified, compact = false }: { creative: LiveCreative; state?: string | null; verified: boolean; compact?: boolean }) {
  const offlinePlayback = state === "OFFLINE_PLAYBACK";
  const playing = state === "PLAYING" || offlinePlayback;
  const image = Boolean(creative.url && creative.mimeType?.startsWith("image/"));
  const video = Boolean(creative.url && creative.mimeType?.startsWith("video/"));
  const label = creative.name || creative.fileName || (playing ? "Creative playing" : "No creative reported");
  const frameClass = compact ? "h-14 w-24 rounded-lg" : "aspect-video min-h-48 w-full rounded-xl";
  return <div className={`relative overflow-hidden bg-[#11130f] text-white ${frameClass}`}>
    {image && <img src={creative.url!} alt={label} loading="lazy" decoding="async" className="h-full w-full object-contain"/>}
    {video && !compact && <video key={creative.url!} autoPlay loop controls muted playsInline preload="metadata" className="h-full w-full bg-black object-contain" aria-label={`Asset preview of ${label}`}><source src={creative.url!} type={creative.mimeType!}/>Your browser cannot play this creative.</video>}
    {video && compact && <div className="flex h-full w-full items-center justify-center bg-black"><Play size={18} fill="currentColor"/><span className="sr-only">Video creative</span></div>}
    {!image && !video && <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-400"><ImageIcon size={compact ? 18 : 28}/>{!compact && <span className="text-xs">Preview unavailable</span>}</div>}
    <div className={`pointer-events-none absolute flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.1em] ${verified && playing ? "bg-[#dfff00] text-black" : "bg-black/80 text-white"} ${compact ? "bottom-1.5 left-1.5" : "left-3 top-3"}`}><Radio size={9}/>{offlinePlayback ? "Cached playback" : verified && playing ? "Reported live" : playing ? "Last reported" : "Not playing"}</div>
  </div>;
}
export function AdminSubnav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const links = [
    ["Schedule Ads", "/admin/campaigns"],
    ["Upload Ads", "/admin/creatives"],
    ["Content & Zones", "/admin/content"],
    ["Screens", "/admin/screens"],
    ["Live map", "/admin/map"],
    ["Device Health", "/admin/device-health"],
    ["Drivers", "/admin/drivers"],
    ["Orders", "/admin/orders"],
    ["Operations", "/admin/operations"],
  ] as const;

  return <nav aria-label="Admin workspace" className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-neutral-200 text-sm">{links.map(([label, href]) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={active ? "border-b-2 border-[#dfff00] pb-3 font-medium text-neutral-900" : "pb-3 text-neutral-500 hover:text-neutral-900"}>{label}</Link>;
  })}{children}</nav>;
}
