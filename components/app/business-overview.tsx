"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "./app-ui";

type Campaign = { id: string; name: string; status: string };
export function BusinessAnalytics() { return <BusinessCampaignSummary title="Analytics" description="Campaign status and verified delivery summaries."/>; }
export function BusinessReports() { return <BusinessCampaignSummary title="Reports" description="Campaign reporting based on verified delivery events."/>; }
function BusinessCampaignSummary({ title, description }: { title: string; description: string }) { const [campaigns, setCampaigns] = useState<Campaign[]>([]); useEffect(() => { void fetch("/api/campaigns", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(payload => setCampaigns(Array.isArray(payload?.data) ? payload.data : [])).catch(() => setCampaigns([])); }, []); return <div className="space-y-8"><PageHeader title={title} description={description}/><SectionCard title="Campaigns">{campaigns.length ? <div className="divide-y">{campaigns.map(campaign => <Link href={`/campaigns/${campaign.id}`} className="flex items-center justify-between gap-4 py-4 first:pt-0" key={campaign.id}><span className="font-medium">{campaign.name}</span><StatusBadge>{campaign.status.replaceAll("_", " ")}</StatusBadge></Link>)}</div> : <EmptyState title="No campaigns yet." description="Create a campaign to see its status here."/>}</SectionCard></div>; }
