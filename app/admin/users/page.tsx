"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, KeyRound, MailPlus, RefreshCw, Users, X } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/app/app-ui";

const roles = ["ADMIN", "SUPER_ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"] as const;
type Admin = { id: string; name: string | null; email: string | null; role: string; accountStatus: string; createdAt: string };
type Invite = { id: string; email: string; name: string; role: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };

function invitationStatus(invite: Invite) {
  if (invite.acceptedAt) return "Accepted";
  if (invite.revokedAt) return "Revoked";
  return new Date(invite.expiresAt) < new Date() ? "Expired" : "Pending";
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Admin[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("OPERATIONS");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [userResponse, inviteResponse] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/users/invitations", { cache: "no-store" }),
    ]);
    if (!userResponse.ok || !inviteResponse.ok) throw new Error("Unable to load administrator accounts. Super Admin access is required.");
    const [userPayload, invitePayload] = await Promise.all([userResponse.json(), inviteResponse.json()]);
    setUsers(userPayload.data?.users ?? []);
    setInvites(invitePayload.data ?? []);
    setReady(true);
  }, []);

  useEffect(() => { void load().catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load administrator accounts.")); }, [load]);

  const pendingInvites = useMemo(() => invites.filter((invite) => invitationStatus(invite) === "Pending"), [invites]);
  const activeAdmins = useMemo(() => users.filter((user) => user.accountStatus === "ACTIVE").length, [users]);

  async function request(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Request failed. Please try again.");
      await load();
      setNotice(method === "POST" && path.endsWith("/invitations") ? "Invitation sent. The recipient can set their password from the secure email link." : "Changes saved successfully.");
      if (method === "POST" && path.endsWith("/invitations")) { setName(""); setEmail(""); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-7">
    <PageHeader title="Team access" description="Invite administrators, assign the right access, and protect active sessions." action={<button type="button" onClick={() => { setError(""); void load().catch((reason) => setError(String(reason))); }} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-500 disabled:opacity-50"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/>Refresh</button>} />

    <section aria-label="Access overview" className="grid divide-y divide-neutral-200 border-y border-neutral-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {[
        { label: "Accounts", value: ready ? users.length : "—" },
        { label: "Active", value: ready ? activeAdmins : "—" },
        { label: "Invitations awaiting acceptance", value: ready ? pendingInvites.length : "—" },
      ].map(({ label, value }) => <div key={label} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-5"><p className="text-sm text-neutral-600">{label}</p><p className="text-lg font-semibold tabular-nums text-neutral-950">{value}</p></div>)}
    </section>

    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><X size={17} className="mt-0.5 shrink-0 text-red-700"/><div className="min-w-0 flex-1">{error}<button type="button" className="ml-3 font-medium underline underline-offset-4" onClick={() => void load().catch((reason) => setError(String(reason)))}>Try again</button></div></div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-[#d9e8a4] bg-[#f7fadf] px-4 py-3 text-sm text-neutral-800"><Check size={16} className="text-[#53651a]"/>{notice}</div>}

    <SectionCard title="Invite a team member" description="Send a secure activation link, then assign only the access their role needs.">
      <form onSubmit={(event) => { event.preventDefault(); void request("/api/admin/users/invitations", "POST", { name, email, role }); }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_auto] xl:items-end">
        <label className="block text-sm font-medium text-neutral-800">Full name<input aria-label="Full name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="name" className="mt-2 block min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10"/></label>
        <label className="block text-sm font-medium text-neutral-800">Work email<input aria-label="Work email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" className="mt-2 block min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10"/></label>
        <label className="block text-sm font-medium text-neutral-800">Access role<select aria-label="Access role" value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <button disabled={busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-yellow)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-wait disabled:opacity-50 xl:min-w-44">{busy ? <RefreshCw size={15} className="animate-spin"/> : <MailPlus size={16}/>}Send invitation</button>
      </form>
      <p className="mt-4 flex items-start gap-2 border-t border-neutral-100 pt-4 text-xs leading-5 text-neutral-500"><KeyRound size={14} className="mt-0.5 shrink-0"/>Invitation links expire in 48 hours. New administrators create their own password through the secure link.</p>
    </SectionCard>

    <SectionCard title="Administrators" description="Role changes and session revocations take effect immediately.">
      {!ready ? <div className="space-y-3 py-3" aria-label="Loading administrator accounts"><div className="h-10 animate-pulse rounded-lg bg-neutral-100"/><div className="h-14 animate-pulse rounded-lg bg-neutral-100"/><div className="h-14 animate-pulse rounded-lg bg-neutral-100"/></div> : users.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 bg-[#fafaf8] px-6 py-12 text-center"><Users className="mx-auto text-neutral-400" size={24}/><p className="mt-3 text-sm font-medium">No administrator accounts yet</p><p className="mt-1 text-sm text-neutral-500">Send an invitation above to add your first team member.</p></div> : <div className="overflow-x-auto rounded-xl border border-neutral-200"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#f2f4ec] text-[11px] uppercase tracking-[.1em] text-neutral-600"><tr><th className="px-4 py-3 font-semibold">Administrator</th><th className="px-4 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">Role</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100 bg-white">{users.map((user) => <tr key={user.id} className="align-middle transition-colors hover:bg-[#fcfcfa]"><td className="px-4 py-4"><p className="font-semibold text-neutral-900">{user.name || "Unnamed administrator"}</p><p className="mt-1 text-xs text-neutral-500">{user.email || "No email on file"}</p></td><td className="px-4 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium ${user.accountStatus === "ACTIVE" ? "bg-[#eef5d6] text-[#465719]" : "bg-neutral-100 text-neutral-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${user.accountStatus === "ACTIVE" ? "bg-[#718d28]" : "bg-neutral-400"}`}/>{user.accountStatus.replaceAll("_", " ")}</span></td><td className="px-4 py-4"><select aria-label={`Role for ${user.email}`} value={user.role} disabled={busy} onChange={(event) => { const nextRole = event.target.value; if (confirm(`Change ${user.name || user.email}'s role to ${nextRole.replaceAll("_", " ")}? Their active sessions will be revoked.`)) void request(`/api/admin/users/${user.id}`, "PATCH", { role: nextRole }); else event.currentTarget.value = user.role; }} className="min-h-10 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 disabled:opacity-50">{roles.map((item) => <option key={item}>{item}</option>)}</select></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" disabled={busy} className="min-h-10 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50" onClick={() => { const nextStatus = user.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE"; if (confirm(`${nextStatus === "SUSPENDED" ? "Suspend" : "Activate"} ${user.name || user.email}?`)) void request(`/api/admin/users/${user.id}`, "PATCH", { accountStatus: nextStatus }); }}>{user.accountStatus === "ACTIVE" ? "Suspend" : "Activate"}</button><button type="button" disabled={busy} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50" onClick={() => { if (confirm(`Sign ${user.name || user.email} out of all active sessions?`)) void request(`/api/admin/users/${user.id}/revoke-sessions`, "POST"); }}>Revoke sessions<ArrowUpRight size={13}/></button></div></td></tr>)}</tbody></table></div>}
    </SectionCard>

    <SectionCard title="Invitations" description="Track invitations before and after they are accepted.">
      {invites.length === 0 ? <p className="rounded-xl bg-[#fafaf8] px-4 py-8 text-center text-sm text-neutral-500">No invitations have been sent yet.</p> : <div className="divide-y divide-neutral-100">{invites.map((invite) => { const status = invitationStatus(invite); return <div key={invite.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{invite.name || invite.email}</p><p className="mt-1 truncate text-xs text-neutral-500">{invite.email} · {invite.role.replaceAll("_", " ")}</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${status === "Pending" ? "bg-[#f3ffb3] text-neutral-800" : status === "Accepted" ? "bg-[#eef5d6] text-[#465719]" : "bg-neutral-100 text-neutral-600"}`}>{status}</span>{status === "Pending" && <button type="button" disabled={busy} className="min-h-10 rounded-lg border border-neutral-200 px-3 text-xs font-medium transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 disabled:opacity-50" onClick={() => { if (confirm(`Revoke the invitation for ${invite.email}?`)) void request(`/api/admin/users/invitations/${invite.id}/revoke`, "POST"); }}>Revoke</button>}</div></div>; })}</div>}
    </SectionCard>
  </div>;
}
