"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { normalizeIndianPhone } from "@/apps/api/src/domain/phone";
import { normalizeWebsite } from "@/apps/api/src/domain/website";

type Kind = "brand" | "agency";
type Field = [name: string, label: string, type: string, required: boolean];

export function OrganizationForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const fields: Field[] = kind === "brand"
    ? [["companyName", "Company name", "text", true], ["website", "Company website", "text", true], ["industry", "Industry", "text", true], ["workEmail", "Company/work email", "email", true], ["role", "Your role / title", "text", true], ["phone", "Phone number", "tel", true], ["city", "City", "text", true], ["address", "Company address (optional)", "text", false], ["monthlyBudget", "Approx monthly advertising budget", "text", false], ["objective", "Campaign objective", "text", true], ["gstDetails", "GST / company details (optional)", "text", false]]
    : [["agencyName", "Agency name", "text", true], ["website", "Company website", "text", true], ["headquarters", "Headquarters / city", "text", true], ["companyEmail", "Company email", "email", true], ["teamSize", "Team size", "text", true], ["clientCount", "Approx number of clients", "number", true], ["monthlySpendEstimate", "Estimated monthly media spend", "number", true], ["primaryMarkets", "Primary markets", "text", true], ["contactName", "Contact person", "text", true], ["contactRole", "Role", "text", true], ["phone", "Phone number", "tel", true], ["gstDetails", "GST / company details (optional)", "text", false]];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setErrors({}); setFormError("");
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const nextErrors: Record<string, string> = {};
    for (const [name, label, , required] of fields) if (required && !String(data[name] ?? "").trim()) nextErrors[name] = `${label} is required.`;
    const website = normalizeWebsite(String(data.website ?? ""));
    if (website === null) nextErrors.website = "Enter a valid website.";
    if (data.phone && !normalizeIndianPhone(data.phone)) nextErrors.phone = "Enter a valid phone number.";
    if (data[kind === "brand" ? "workEmail" : "companyEmail"] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[kind === "brand" ? "workEmail" : "companyEmail"])) nextErrors[kind === "brand" ? "workEmail" : "companyEmail"] = "Enter a valid email address.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      const first = Object.keys(nextErrors)[0];
      window.setTimeout(() => refs.current[first]?.focus({ preventScroll: true }), 0);
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/onboarding/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, website }) });
    const payload = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setFormError(payload.error?.message || "We couldn't submit your request. Please review the highlighted fields."); return; }
    router.push(kind === "brand" ? "/verification" : "/agency");
  }

  return <form noValidate onSubmit={submit} className="space-y-5"><p className="text-xs text-neutral-500">Step 1 of 3 · Organisation</p>{fields.map(([name, label, type, required]) => <label className="block text-sm font-medium" key={name}>{label}{name === "website" && <span className="ml-1 font-normal text-neutral-500">(e.g. theooro.com)</span>}<input ref={element => { refs.current[name] = element; }} required={required} name={name} type={type} inputMode={name === "phone" ? "tel" : undefined} autoComplete={name === "phone" ? "tel" : undefined} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} className="mt-2 block w-full rounded-[8px] border border-neutral-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-black"/>{errors[name] && <span id={`${name}-error`} className="mt-1 block text-xs font-normal text-red-700">{errors[name]}</span>}</label>)}{formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}<button type="submit" disabled={busy} className="w-full rounded-[8px] bg-black px-4 py-3.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Submitting…" : kind === "brand" ? "Request brand verification" : "Submit agency application"}</button></form>;
}
