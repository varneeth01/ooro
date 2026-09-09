"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SecondaryButton, StatusBadge } from "./app-ui";

type Asset = { id: string; fileName: string; mimeType?: string | null; sizeBytes?: number | null; checksum?: string | null; url?: string | null };
type Creative = { id: string; asset: Asset | null };
type Delivery = { displayId: string; displayName: string; online: boolean; state: string; manifestVersion: number | null; lastSync: string | null; commandStatus: string; deliveryState: string; assetPersisted: boolean };
type Campaign = { id: string; name: string; status: string; description: string | null; startsAt: string | null; endsAt: string | null; metadata: Record<string, unknown>; creatives: Creative[] };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: unknown, empty = "—") {
  const number = finiteNumber(value);
  return number === null ? empty : number.toLocaleString("en-IN");
}

function formatInr(value: unknown) {
  const number = finiteNumber(value);
  return number === null ? "Not set" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(number);
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Not set" : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Never" : parsed.toLocaleString("en-IN");
}

function normalizeCampaign(value: unknown): Campaign | null {
  const input = record(value);
  if (!input || typeof input.id !== "string") return null;
  const metadata = record(input.metadata) ?? {};
  const creatives = Array.isArray(input.creatives) ? input.creatives.flatMap((item): Creative[] => {
    const creative = record(item);
    if (!creative || typeof creative.id !== "string") return [];
    const asset = record(creative.asset);
    return [{
      id: creative.id,
      asset: asset && typeof asset.id === "string" && typeof asset.fileName === "string" ? {
        id: asset.id,
        fileName: asset.fileName,
        mimeType: typeof asset.mimeType === "string" ? asset.mimeType : null,
        sizeBytes: finiteNumber(asset.sizeBytes ?? asset.size),
        checksum: typeof asset.checksum === "string" ? asset.checksum : null,
        url: typeof asset.url === "string" ? asset.url : null,
      } : null,
    }];
  }) : [];
  return {
    id: input.id,
    name: typeof input.name === "string" && input.name.trim() ? input.name : "Untitled campaign",
    status: typeof input.status === "string" ? input.status : "DRAFT",
    description: typeof input.description === "string" ? input.description : null,
    startsAt: typeof input.startsAt === "string" ? input.startsAt : null,
    endsAt: typeof input.endsAt === "string" ? input.endsAt : null,
    metadata,
    creatives,
  };
}

function normalizeDelivery(value: unknown): Delivery[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Delivery[] => {
    const input = record(item);
    if (!input || typeof input.displayId !== "string") return [];
    return [{
      displayId: input.displayId,
      displayName: typeof input.displayName === "string" ? input.displayName : input.displayId,
      online: input.online === true,
      state: typeof input.state === "string" ? input.state : "UNKNOWN",
      manifestVersion: finiteNumber(input.manifestVersion),
      lastSync: typeof input.lastSync === "string" ? input.lastSync : null,
      commandStatus: typeof input.commandStatus === "string" ? input.commandStatus : "PENDING_SYNC",
      deliveryState: typeof input.deliveryState === "string" ? input.deliveryState : "PENDING",
      assetPersisted: input.assetPersisted === true,
    }];
  });
}

export function CampaignDetail({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [delivery, setDelivery] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setDeliveryError("");
    try {
      const [campaignResponse, deliveryResponse] = await Promise.all([
        fetch(`/api/campaigns/${id}`, { cache: "no-store" }),
        fetch(`/api/campaigns/${id}/delivery`, { cache: "no-store" }),
      ]);
      const campaignPayload = await campaignResponse.json().catch(() => null);
      const deliveryPayload = await deliveryResponse.json().catch(() => null);
      if (!campaignResponse.ok) throw new Error(campaignPayload?.error?.message || "Campaign could not be loaded");
      const normalized = normalizeCampaign(campaignPayload?.data);
      if (!normalized) throw new Error("Campaign response was incomplete");
      setCampaign(normalized);
      if (deliveryResponse.ok) setDelivery(normalizeDelivery(deliveryPayload?.data));
      else { setDelivery([]); setDeliveryError(deliveryPayload?.error?.message || "Delivery status could not be loaded"); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Campaign could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="py-16 text-center text-sm text-neutral-500">Loading campaign…</div>;
  if (error || !campaign) return <div className="space-y-5"><PageHeader title="Campaign" action={<SecondaryButton href="/campaigns">Back</SecondaryButton>}/><div role="alert" className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error || "Campaign not found"}<button type="button" onClick={() => void load()} className="ml-4 inline-flex items-center gap-2 font-medium"><RefreshCw size={14}/>Retry</button></div></div>;

  const meta = campaign.metadata;
  const synced = delivery.filter(item => item.deliveryState === "READY").length;
  const pending = delivery.filter(item => !["READY", "FAILED"].includes(item.deliveryState)).length;
  const failed = delivery.filter(item => item.deliveryState === "FAILED").length;
  return <div className="space-y-8"><PageHeader eyebrow="Campaign workspace" title={campaign.name} description={campaign.description || "Persisted campaign and display delivery state."} action={<div className="flex gap-3"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 px-3 text-sm text-neutral-500 hover:text-black"><RefreshCw size={14}/>Refresh</button><SecondaryButton href="/campaigns">Back</SecondaryButton></div>}/><div className="grid gap-6 lg:grid-cols-2"><section className="border border-neutral-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-medium">Campaign setup</h2><StatusBadge>{campaign.status.replaceAll("_", " ")}</StatusBadge></div><dl className="mt-6 space-y-4 text-sm"><Row label="Goal" value={String(meta.goal || "Not set")}/><Row label="Audience" value={String(meta.audience || "Not set")}/><Row label="Location" value={[meta.area, meta.city].filter(Boolean).join(", ") || "Not set"}/><Row label="Schedule" value={`${formatDate(campaign.startsAt)} — ${formatDate(campaign.endsAt)}`}/><Row label="Budget" value={formatInr(meta.budget)}/></dl></section><section className="border border-neutral-200 bg-white p-6"><h2 className="font-medium">Creative</h2>{campaign.creatives.length ? campaign.creatives.map(creative => <div key={creative.id} className="mt-5 border border-neutral-200 p-4 text-sm">{creative.asset ? <><p className="font-medium">{creative.asset.fileName}</p><p className="mt-2 text-xs text-neutral-500">Persisted: YES · {creative.asset.mimeType || "Unknown type"} · {formatNumber(creative.asset.sizeBytes, "Size unavailable")} bytes</p><p className="mt-2 break-all font-mono text-[10px] text-neutral-400">{creative.asset.checksum || "Checksum unavailable"}</p></> : <p className="text-sm text-neutral-500">Creative asset not available.</p>}</div>) : <p className="mt-5 text-sm text-neutral-500">Not uploaded</p>}</section></div><section className="border border-neutral-200 bg-white p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-medium">Display delivery</h2><p className="mt-1 text-sm text-neutral-500">Ready {synced} · Pending {pending} · Failed {failed}</p></div></div>{deliveryError ? <div role="alert" className="mt-6 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{deliveryError}<button type="button" onClick={() => void load()} className="ml-3 font-medium underline">Retry</button></div> : delivery.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-y border-neutral-200 text-xs text-neutral-500"><th className="py-3">Display</th><th>Connection</th><th>Delivery</th><th>Manifest</th><th>Last sync</th><th>Command</th><th>Asset</th></tr></thead><tbody>{delivery.map(item => <tr key={item.displayId} className="border-b border-neutral-100"><td className="py-4">{item.displayName}<span className="block font-mono text-[10px] text-neutral-400">{item.displayId}</span></td><td>{item.online ? "ONLINE" : "OFFLINE"}</td><td>{item.deliveryState}</td><td>{item.manifestVersion === null ? "—" : `v${formatNumber(item.manifestVersion)}`}</td><td>{formatDateTime(item.lastSync)}</td><td>{item.commandStatus}</td><td>{item.assetPersisted ? "PERSISTED" : "MISSING"}</td></tr>)}</tbody></table></div> : <p className="mt-6 border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">No displays assigned. Delivery is pending.</p>}</section></div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-neutral-100 pb-3"><dt className="text-neutral-500">{label}</dt><dd className="text-right">{value}</dd></div>; }
