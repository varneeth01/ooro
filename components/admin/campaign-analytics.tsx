"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/app/app-ui";

type Analytics = { completedPlays: number; qrScans: number; scanRate: number | null };

export function AdminCampaignAnalytics({ campaignId }: { campaignId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error?.message || "Campaign analytics unavailable");
        setAnalytics(payload.data.analytics);
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : "Campaign analytics unavailable"));
  }, [campaignId]);

  return <SectionCard title="Campaign analytics" description="Completed plays and QR scans come from persisted device and redirect events.">
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <div className="grid gap-4 sm:grid-cols-3">
      <Metric label="Completed Plays" value={analytics?.completedPlays ?? "—"}/>
      <Metric label="QR Scans" value={analytics?.qrScans ?? "—"}/>
      <Metric label="Scan Rate" value={analytics ? analytics.scanRate === null ? "—" : `${analytics.scanRate.toFixed(1)}%` : "—"}/>
    </div>}
  </SectionCard>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="border border-neutral-200 p-4"><p className="app-eyebrow">{label}</p><p className="mt-2 text-2xl font-medium">{value}</p></div>;
}
