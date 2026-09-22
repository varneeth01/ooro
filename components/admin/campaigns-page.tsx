"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, PrimaryButton, SectionCard, StatusBadge } from "@/components/app/app-ui";
import { AdminSubnav } from "./admin-ui";

type Campaign = {
  id: string;
  name: string;
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
  selectedScreens: number;
  creative?: { name?: string; asset?: { fileName?: string } | null } | null;
};

const steps = [
  ["1", "Schedule", "Set campaign dates and status"],
  ["2", "Upload", "Add an image or video creative"],
  ["3", "Configure", "Add the offer, CTA, and QR destination"],
  ["4", "Select screens", "Choose one or more eligible displays"],
  ["5", "Activate & sync", "Push the manifest to selected screens"],
] as const;

export function AdminCampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/campaigns", { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || "Unable to load campaigns");
        setItems(body.data ?? []);
      })
      .catch(error => setError(error instanceof Error ? error.message : "Unable to load campaigns"));
  }, []);

  return <div className="space-y-7">
    <PageHeader
      eyebrow="Admin / Advertising"
      title="Schedule and upload ads"
      description="Create a campaign, upload its image or video, choose screens, then activate and sync it to the Android players."
      action={<PrimaryButton href="/admin/campaigns/new">Schedule & Upload Ad</PrimaryButton>}
    />
    <AdminSubnav />
    <SectionCard title="Push an ad to screens" description="The campaign editor keeps the creative, offer, QR code, schedule, and selected screens together.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map(([number, title, description]) => <div key={number} className="border border-neutral-200 bg-neutral-50 p-4">
          <span className="font-mono text-[10px] text-neutral-400">STEP {number}</span>
          <p className="mt-2 text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
        </div>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <PrimaryButton href="/admin/campaigns/new">Create, Schedule & Upload</PrimaryButton>
        <Link className="inline-flex items-center border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50" href="/admin/creatives">Open Creative Library</Link>
      </div>
    </SectionCard>
    <SectionCard title="Campaigns" description="Offline screens remain scheduled and receive the manifest when they reconnect.">
      {error ? <p className="py-10 text-sm text-red-700">{error}</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead><tr className="border-b border-neutral-200 text-xs text-neutral-500"><th className="py-3">Campaign</th><th>Status</th><th>Creative</th><th>Dates</th><th>Screens</th><th /></tr></thead>
          <tbody>{items.map(item => <tr key={item.id} className="border-b border-neutral-100">
            <td className="py-4"><Link className="font-medium hover:underline" href={`/admin/campaigns/${item.id}`}>{item.name}</Link><span className="block font-mono text-[10px] text-neutral-400">{item.id}</span></td>
            <td><StatusBadge>{item.status}</StatusBadge></td>
            <td>{item.creative?.asset?.fileName || "Not uploaded"}</td>
            <td>{item.startsAt ? `${new Date(item.startsAt).toLocaleDateString()} — ${item.endsAt ? new Date(item.endsAt).toLocaleDateString() : "—"}` : "Not scheduled"}</td>
            <td>{item.selectedScreens}</td>
            <td><Link className="text-xs underline" href={`/admin/campaigns/${item.id}`}>Open</Link></td>
          </tr>)}</tbody>
        </table>
        {!items.length && !error && <p className="py-10 text-center text-sm text-neutral-500">No admin campaigns yet. Use “Schedule & Upload Ad” to create one.</p>}
      </div>}
    </SectionCard>
  </div>;
}
