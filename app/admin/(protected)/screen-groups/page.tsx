"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/app-ui";
import { AdminSubnav } from "@/components/admin/admin-ui";

type Group = { id: string; name: string; members: { displayId: string }[] };
type Screen = { id: string; name: string };

const inputClass = "mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-[#dfff00] focus:ring-2 focus:ring-[#dfff00]/20";

export default function Page() {
  const [data, setData] = useState<{ groups: Group[]; screens: Screen[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  const [id, setId] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/scheduler", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Screen groups could not be loaded.");
      setData(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Screen groups could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const filteredScreens = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.screens ?? [];
    return (data?.screens ?? []).filter(screen => screen.name.toLowerCase().includes(needle) || screen.id.toLowerCase().includes(needle));
  }, [data, search]);

  function newGroup() {
    setId("");
    setName("");
    setIds([]);
    setSaved("");
    setError("");
  }

  function toggleScreen(screenId: string) {
    setIds(current => current.includes(screenId) ? current.filter(value => value !== screenId) : [...current, screenId]);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/screen-groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: id || undefined, name: name.trim(), screenIds: ids }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Group could not be saved.");
      await load();
      setId(payload.data?.id ?? id);
      setSaved("Group saved. Existing schedules need to be republished to apply membership changes.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Group could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-7 sm:space-y-8">
    <PageHeader eyebrow="Admin / Network" title="Screen groups" description="Organize screens into reusable groups for campaign targeting." action={<button type="button" onClick={newGroup} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--brand-yellow)] px-4 text-sm font-semibold text-black"><Plus size={16}/>New group</button>} />
    <AdminSubnav />

    {error && <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"><p>{error}</p><button type="button" onClick={() => void load()} className="shrink-0 font-semibold underline underline-offset-4">Retry</button></div>}
    {saved && <p role="status" className="rounded-xl border border-lime-400/20 bg-lime-400/[.06] px-4 py-3 text-sm text-lime-100">{saved}</p>}

    {loading && !data ? <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-[#191f24]" aria-label="Loading screen groups"/> : !data ? <SectionCard title="Groups unavailable" description="The group list could not be loaded."><button type="button" onClick={() => void load()} className="text-sm font-semibold text-[#dfff00] underline">Try again</button></SectionCard> : <div className="grid items-start gap-6 xl:grid-cols-[minmax(260px,.75fr)_minmax(0,1.25fr)]">
      <SectionCard title="Your groups" description={`${data.groups.length} group${data.groups.length === 1 ? "" : "s"}`}>
        {data.groups.length ? <div className="space-y-2">{data.groups.map(group => <button type="button" key={group.id} aria-pressed={id === group.id} onClick={() => { setId(group.id); setName(group.name); setIds(group.members.map(member => member.displayId)); setSaved(""); setError(""); }} className={`flex min-h-[68px] w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition ${id === group.id ? "border-[#dfff00]/40 bg-[#dfff00]/[.06]" : "border-neutral-200 bg-white hover:border-[#dfff00]/30"}`}><span className="min-w-0"><span className="block truncate text-sm font-semibold text-neutral-100">{group.name}</span><span className="mt-1 block text-xs text-neutral-500">{group.members.length} screen{group.members.length === 1 ? "" : "s"}</span></span>{id === group.id && <Check size={16} className="shrink-0 text-[#dfff00]"/>}</button>)}</div> : <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-7 text-center text-sm text-neutral-500">No groups yet. Create one to target multiple screens together.</p>}
      </SectionCard>

      <SectionCard title={id ? "Edit group" : "Create a group"} description="Give the group a clear name, then choose the screens that belong in it.">
        <form onSubmit={event => void save(event)} className="space-y-5">
          <label className="block text-sm font-medium text-neutral-200">Group name<input required maxLength={80} className={inputClass} placeholder="e.g. Bengaluru · Indiranagar" value={name} onChange={event => setName(event.target.value)}/></label>
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="text-sm font-semibold text-neutral-200">Choose screens</h3><p className="mt-1 text-xs text-neutral-500">{ids.length} selected · Screen ID suffix distinguishes duplicate names.</p></div>
              <label className="flex min-h-10 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm"><Search size={15} className="text-neutral-500"/><span className="sr-only">Search screens</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search screens" className="w-full min-w-0 bg-transparent outline-none sm:w-48"/></label>
            </div>
            <div className="mt-3 max-h-[420px] overflow-y-auto rounded-xl border border-neutral-200">
              {filteredScreens.length ? <ul className="divide-y divide-neutral-200">{filteredScreens.map(screen => <li key={screen.id}><label className="flex min-h-[60px] cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-white/[.04]"><input type="checkbox" checked={ids.includes(screen.id)} onChange={() => toggleScreen(screen.id)} className="h-4 w-4 accent-[#dfff00]"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-100">{screen.name}</span><span className="mt-0.5 block font-mono text-[11px] text-neutral-500">ID · {screen.id.slice(-8)}</span></span>{ids.includes(screen.id) && <span className="text-xs font-semibold text-[#dfff00]">Selected</span>}</label></li>)}</ul> : <p className="px-4 py-8 text-center text-sm text-neutral-500">{search ? "No screens match that search." : "No screens are available yet."}</p>}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={newGroup} className="min-h-11 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-200 hover:bg-white/[.05]">Clear form</button>
            <button type="submit" disabled={busy || !name.trim()} className="min-h-11 rounded-lg bg-[var(--brand-yellow)] px-5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : id ? "Save changes" : "Create group"}</button>
          </div>
          <p className="text-xs leading-5 text-neutral-500">Changing group membership does not update existing schedules automatically. Republish those schedules to apply the change.</p>
        </form>
      </SectionCard>
    </div>}
  </div>;
}
