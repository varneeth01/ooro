"use client";

import { useMemo, useState } from "react";

const fields = [
  { key: "brand", label: "Brand or business", placeholder: "e.g. a neighbourhood café" },
  { key: "objective", label: "Campaign objective", placeholder: "e.g. introduce a new location" },
  { key: "audience", label: "Audience context", placeholder: "Who may find this offer useful, and why?" },
  { key: "areas", label: "Preferred Bengaluru areas", placeholder: "List preferences; these are not guaranteed placements" },
  { key: "dates", label: "Campaign dates and timing", placeholder: "Start/end dates, days or hours" },
  { key: "budget", label: "Working budget (₹)", placeholder: "Amount and what it includes" },
  { key: "message", label: "Main message and offer", placeholder: "One short message, including important terms" },
  { key: "action", label: "Call to action", placeholder: "Visit, scan, call, or remember" },
  { key: "creative", label: "Creative available", placeholder: "Image/video status; check format specs with provider" },
  { key: "destination", label: "Landing page or QR destination", placeholder: "https://…" },
  { key: "reporting", label: "Reporting questions", placeholder: "Proof-of-Play definition, screens, exceptions, report timing" },
] as const;

type BriefKey = (typeof fields)[number]["key"];

export function CampaignBriefBuilder() {
  const [values, setValues] = useState<Record<BriefKey, string>>({
    brand: "", objective: "", audience: "", areas: "", dates: "", budget: "",
    message: "", action: "", creative: "", destination: "", reporting: "",
  });
  const [copyState, setCopyState] = useState("");
  const brief = useMemo(() => [
    "DOOH CAMPAIGN BRIEF",
    "",
    ...fields.map(({ key, label }) => `${label}: ${values[key].trim() || "[Add details]"}`),
    "",
    "Planning note: This brief is a request, not a confirmation of inventory, reach, price, route or booking. Delivery and terms require provider confirmation.",
  ].join("\n"), [values]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopyState("Brief copied.");
    } catch {
      setCopyState("Copy was unavailable. Select the brief text and copy it manually.");
    }
  }

  return <div className="container-ooro grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_.85fr]">
    <div>
      <p className="max-w-2xl text-neutral-700">Fill in what you know. Leave unknown details blank and ask the media provider to confirm them. Your entries stay in this browser and are not submitted.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {fields.map(({ key, label, placeholder }) => <label key={key} className="grid gap-2 text-sm font-medium">
          <span>{label}</span>
          <textarea rows={key === "message" || key === "reporting" || key === "audience" ? 3 : 2} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} className="w-full resize-y rounded-lg border border-black/20 bg-white px-4 py-3 font-normal outline-none transition focus:border-[#829d00] focus:ring-2 focus:ring-[#829d00]/20" />
        </label>)}
      </div>
      <p className="mt-5 text-xs leading-5 text-neutral-600">Do not include passwords, payment details or sensitive personal information.</p>
    </div>
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-xl bg-[#101210] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your campaign brief</h2><button type="button" onClick={copyBrief} className="min-h-10 rounded-lg bg-[#dfff00] px-4 text-sm font-semibold text-black">Copy brief</button></div>
        <textarea aria-label="Generated campaign brief" readOnly value={brief} rows={24} className="mt-5 w-full resize-y rounded-lg border border-white/20 bg-white/5 p-4 font-mono text-xs leading-6 text-white outline-none" />
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-neutral-300">{copyState}</p>
        <p className="mt-4 text-xs leading-5 text-neutral-400">The generated brief does not check live inventory, calculate reach, quote rates or place a booking.</p>
      </div>
    </aside>
  </div>;
}
