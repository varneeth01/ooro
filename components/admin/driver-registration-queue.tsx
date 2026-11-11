"use client";

import { useEffect, useState, type FormEvent } from "react";

type Driver = {
  id: string;
  onboardingStatus: string;
  user: { name?: string | null; phone: string; accountStatus: string };
  city?: string | null;
  documents: Array<{ id: string; documentType: string; status: string; rejectionReason?: string | null }>;
};

type DriverDraft = { name: string; phone: string; city: string };
const emptyDraft: DriverDraft = { name: "", phone: "", city: "" };
const inputClass = "mt-2 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10";

export function DriverRegistrationQueue({ canCreate = false }: { canCreate?: boolean }) {
  const [items, setItems] = useState<Driver[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selected, setSelected] = useState<Driver | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<DriverDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/drivers", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Unable to load drivers");
      setItems(payload.data || []);
      setError("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to load drivers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draft.name, phone: draft.phone, city: draft.city || undefined }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error?.message || "Could not add this driver");
      setDraft(emptyDraft);
      setShowCreate(false);
      setSuccess("Driver profile added as pending. They can sign in with their phone number and complete onboarding.");
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not add this driver");
    } finally {
      setSaving(false);
    }
  }

  async function decide(driverId: string, decision: "APPROVE" | "REJECT") {
    const reason = decision === "REJECT" ? window.prompt("Reason for rejection") : undefined;
    if (decision === "REJECT" && !reason?.trim()) return;
    setError("");
    const response = await fetch(`/api/admin/drivers/${driverId}/approval`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error?.message || "Approval failed");
      return;
    }
    setSelected(null);
    await load();
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">Driver records</p>
        <p className="mt-1 text-sm text-neutral-500">{items.length} {items.length === 1 ? "driver" : "drivers"} · New profiles start as pending.</p>
      </div>
      {canCreate && <button type="button" onClick={() => { setShowCreate(value => !value); setError(""); setSuccess(""); }} aria-expanded={showCreate} className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800">{showCreate ? "Close form" : "Add driver"}</button>}
    </div>

    {showCreate && canCreate && <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold">Add a driver profile</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">This creates a pending onboarding profile. The driver must sign in with phone OTP and submit the required identity documents before approval.</p>
      </div>
      <form onSubmit={event => void createDriver(event)} className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-medium">Full name<input required minLength={2} maxLength={120} autoComplete="name" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} placeholder="Driver name" className={inputClass}/></label>
        <label className="text-sm font-medium">Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" minLength={7} maxLength={20} value={draft.phone} onChange={event => setDraft({ ...draft, phone: event.target.value })} placeholder="+91 98765 43210" className={inputClass}/></label>
        <label className="text-sm font-medium">City <span className="font-normal text-neutral-400">Optional</span><input maxLength={120} autoComplete="address-level2" value={draft.city} onChange={event => setDraft({ ...draft, city: event.target.value })} placeholder="Bengaluru" className={inputClass}/></label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-[#dfff00] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">{saving ? "Adding driver…" : "Create pending profile"}</button>
          <span className="text-xs text-neutral-500">No documents are added or approved by this action.</span>
        </div>
      </form>
    </section>}

    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">{success}</p>}

    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {loading ? <p className="p-8 text-sm text-neutral-500">Loading driver records…</p> : items.length ? items.map(item => <div className="grid gap-4 border-b border-neutral-200 p-5 last:border-b-0 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center" key={item.id}>
        <div><p className="font-medium">{item.user.name || "Unnamed driver"}</p><p className="mt-1 text-xs text-neutral-500">{item.user.phone} · {item.city || "City pending"}</p></div>
        <span className="text-sm">{item.onboardingStatus.replaceAll("_", " ")}</span>
        <span className="text-xs text-neutral-500">{item.documents.length} document(s) · {item.user.accountStatus}</span>
        <div className="flex flex-wrap gap-2"><button type="button" className="rounded-lg border border-neutral-300 px-3 py-2 text-xs" onClick={() => setSelected(item)}>Review</button>{item.onboardingStatus !== "APPROVED" && <button type="button" className="rounded-lg bg-black px-3 py-2 text-xs text-white" onClick={() => void decide(item.id, "APPROVE")}>Approve</button>}<button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700" onClick={() => void decide(item.id, "REJECT")}>Reject</button></div>
      </div>) : <div className="p-8 sm:p-10">
        <p className="font-medium">No driver registrations yet</p>
        <p className="mt-1 text-sm text-neutral-500">{canCreate ? "Add a pending driver profile here, or wait for a driver to register through the app." : "Driver registrations will appear here when someone signs up through the app."}</p>
        {canCreate && !showCreate && <button type="button" className="mt-4 rounded-lg bg-black px-4 py-3 text-sm font-medium text-white" onClick={() => setShowCreate(true)}>Add driver</button>}
      </div>}
    </div>

    {selected && <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{selected.user.name || "Unnamed driver"}</h2><p className="mt-1 text-sm text-neutral-500">{selected.user.phone} · {selected.user.accountStatus}</p></div><button type="button" className="text-sm underline underline-offset-4" onClick={() => setSelected(null)}>Close</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{selected.documents.map(document => <div className="rounded-lg border border-neutral-200 p-3" key={document.id}><p className="text-sm font-medium">{document.documentType}</p><p className="mt-1 text-xs text-neutral-500">{document.status}{document.rejectionReason ? ` · ${document.rejectionReason}` : ""}</p></div>)}</div>
    </section>}
  </div>;
}
