"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader, SecondaryButton, StatusBadge } from "./app-ui";

type Asset = { id: string; fileName: string; mimeType?: string | null; sizeBytes?: number | null; checksum?: string | null; url?: string | null };
type Creative = { id: string; asset: Asset | null };
type Campaign = { id: string; name: string; status: string; description: string | null; startsAt: string | null; endsAt: string | null; metadata: Record<string, unknown>; creatives: Creative[] };
type QrAnalytics = { completedPlays: number; qrScans: number; scanRate: number | null };

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

export function CampaignDetail({ id }: { id: string }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliverySummary, setDeliverySummary] = useState<{ verifiedPlays: number; estimatedPassengerImpressions: number; deliveryProgressPercent: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [qrAnalytics, setQrAnalytics] = useState<QrAnalytics | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setDeliveryError("");
    try {
      const [campaignResponse, deliveryResponse, qrResponse] = await Promise.all([
        fetch(`/api/campaigns/${id}`, { cache: "no-store" }),
        fetch(`/api/campaigns/${id}/delivery`, { cache: "no-store" }),
        fetch(`/api/campaigns/${id}/qr-analytics`, { cache: "no-store" }),
      ]);
      const campaignPayload = await campaignResponse.json().catch(() => null);
      const deliveryPayload = await deliveryResponse.json().catch(() => null);
      if (!campaignResponse.ok) throw new Error(campaignPayload?.error?.message || "Campaign could not be loaded");
      const normalized = normalizeCampaign(campaignPayload?.data);
      if (!normalized) throw new Error("Campaign response was incomplete");
      setCampaign(normalized);
      if (deliveryResponse.ok) setDeliverySummary(deliveryPayload?.summary ?? null);
      else { setDeliverySummary(null); setDeliveryError(deliveryPayload?.error?.message || "Delivery status could not be loaded"); }
      if (qrResponse.ok) { const payload = await qrResponse.json().catch(() => null); setQrAnalytics(payload?.data ?? null); }
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
  return <div className="space-y-8"><PageHeader eyebrow="Campaign workspace" title={campaign.name} description={campaign.description || "Campaign setup and verified delivery."} action={<div className="flex gap-3"><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 px-3 text-sm text-neutral-500 hover:text-black"><RefreshCw size={14}/>Refresh</button><SecondaryButton href="/campaigns">Back</SecondaryButton></div>}/><div className="grid gap-6 lg:grid-cols-2"><section className="border border-neutral-200 bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-medium">Campaign setup</h2><StatusBadge>{campaign.status.replaceAll("_", " ")}</StatusBadge></div><dl className="mt-6 space-y-4 text-sm"><Row label="Goal" value={String(meta.goal || "Not set")}/><Row label="Audience" value={String(meta.audience || "Not set")}/><Row label="Location" value={[meta.area, meta.city].filter(Boolean).join(", ") || "Not set"}/><Row label="Schedule" value={`${formatDate(campaign.startsAt)} — ${formatDate(campaign.endsAt)}`}/><Row label="Budget" value={formatInr(meta.budget)}/></dl></section><section className="border border-neutral-200 bg-white p-6"><h2 className="font-medium">Creative</h2>{campaign.creatives.length ? campaign.creatives.map(creative => <div key={creative.id} className="mt-5 border border-neutral-200 p-4 text-sm">{creative.asset ? <><p className="font-medium">{creative.asset.fileName}</p><p className="mt-2 text-xs text-neutral-500">Persisted: YES · {creative.asset.mimeType || "Unknown type"} · {formatNumber(creative.asset.sizeBytes, "Size unavailable")} bytes</p><p className="mt-2 break-all font-mono text-[10px] text-neutral-400">{creative.asset.checksum || "Checksum unavailable"}</p></> : <p className="text-sm text-neutral-500">Creative asset not available.</p>}</div>) : <p className="mt-5 text-sm text-neutral-500">Not uploaded</p>}</section></div><section className="border border-neutral-200 bg-white p-6"><h2 className="font-medium">QR analytics</h2><div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Completed plays" value={qrAnalytics ? formatNumber(qrAnalytics.completedPlays) : "—"}/><Metric label="QR scans" value={qrAnalytics ? formatNumber(qrAnalytics.qrScans) : "—"}/><Metric label="Scan rate" value={qrAnalytics?.scanRate === null ? "—" : qrAnalytics ? `${qrAnalytics.scanRate.toFixed(1)}%` : "—"}/></div><p className="mt-4 text-xs text-neutral-500">Scan rate = QR scans ÷ completed plays. Counts come from backend events.</p></section><section className="border border-neutral-200 bg-white p-6"><h2 className="font-medium">Delivery summary</h2>{deliveryError ? <div role="alert" className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{deliveryError}<button type="button" onClick={() => void load()} className="ml-3 font-medium underline">Retry</button></div> : <div className="mt-5 grid gap-4 sm:grid-cols-3"><Metric label="Verified plays" value={deliverySummary ? formatNumber(deliverySummary.verifiedPlays) : "—"}/><Metric label="Modeled passenger impressions" value={deliverySummary ? formatNumber(deliverySummary.estimatedPassengerImpressions) : "—"}/><Metric label="Delivery progress" value={deliverySummary ? `${deliverySummary.deliveryProgressPercent}%` : "—"}/></div>}</section></div>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-b border-neutral-100 pb-3"><dt className="text-neutral-500">{label}</dt><dd className="text-right">{value}</dd></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-neutral-200 p-4"><p className="text-xs text-neutral-500">{label}</p><p className="mt-2 text-2xl font-medium">{value}</p></div>; }
