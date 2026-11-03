"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, KeyRound, MailPlus, RefreshCw, Users, X } from "lucide-react";
import { PageHeader, SectionCard, StatusBadge } from "@/components/app/app-ui";

const roles = ["ADMIN", "SUPER_ADMIN", "OPERATIONS", "FINANCE", "SUPPORT"] as const;
type Admin = { id: string; name: string | null; email: string | null; role: string; accountStatus: string; createdAt: string };
type Invite = { id: string; email: string; name: string; role: string; expiresAt: string; acceptedAt: string | null; revokedAt: string | null };
const PAGE_SIZE = 100;

function invitationStatus(invite: Invite) {
  if (invite.acceptedAt) return "Accepted";
  if (invite.revokedAt) return "Revoked";
  return new Date(invite.expiresAt) < new Date() ? "Expired" : "Pending";
}

export function AdminUsersPage({ actorId }: { actorId: string }) {
  const [users, setUsers] = useState<Admin[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [totalInvites, setTotalInvites] = useState(0);
  const [pendingInviteTotal, setPendingInviteTotal] = useState(0);
  const [invitePageIndex, setInvitePageIndex] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("OPERATIONS");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [userResponse, inviteResponse] = await Promise.all([
        fetch(`/api/admin/users?skip=${pageIndex * PAGE_SIZE}&take=${PAGE_SIZE}`, { cache: "no-store" }),
        fetch(`/api/admin/users/invitations?skip=${invitePageIndex * PAGE_SIZE}&take=${PAGE_SIZE}`, { cache: "no-store" }),
      ]);
      if (!userResponse.ok || !inviteResponse.ok) throw new Error("Unable to load administrator accounts. Confirm Super Admin access and try again.");
      const [userPayload, invitePayload] = await Promise.all([userResponse.json(), inviteResponse.json()]);
      setUsers(userPayload.data?.users ?? []);
      setTotalUsers(userPayload.data?.total ?? 0);
      setInvites(invitePayload.data?.items ?? []);
      setTotalInvites(invitePayload.data?.total ?? 0);
      setPendingInviteTotal(invitePayload.data?.pendingTotal ?? 0);
      setLoaded(true);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Unable to load administrator accounts.";
      setError(message);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, [pageIndex, invitePageIndex]);

  useEffect(() => { void load().catch(() => undefined); }, [load]);

  const activeAdmins = useMemo(() => users.filter((user) => user.accountStatus === "ACTIVE").length, [users]);

  async function request(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(path, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Request failed. Please try again.");
      const invited = method === "POST" && path.endsWith("/invitations");
      setNotice(invited ? "Invitation sent. The recipient can create a password from the secure email link." : "Changes saved successfully.");
      if (invited) { setName(""); setEmail(""); }
      try { await load(); }
      catch { setError("Changes saved, but the list could not refresh. Use Refresh to load the latest accounts before making another change."); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const refresh = () => { setNotice(""); void load().catch(() => undefined); };
  const summary = [
    { label: "Accounts", value: loading && !loaded ? "—" : totalUsers },
    { label: "Active on this page", value: loading && !loaded ? "—" : activeAdmins },
    { label: "Invitations pending", value: loading && !loaded ? "—" : pendingInviteTotal },
  ];

  return <div className="space-y-7 sm:space-y-8" aria-busy={loading || busy}>
    <PageHeader title="Team access" description="Invite administrators, set their access, and manage active accounts." action={<button type="button" onClick={refresh} disabled={loading || busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition hover:border-neutral-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button>} />

    <section aria-label="Access overview" className="grid grid-cols-1 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {summary.map(({ label, value }) => <div key={label} className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-5"><p className="text-sm text-neutral-600">{label}</p><p className="text-lg font-semibold tabular-nums text-neutral-950">{value}</p></div>)}
    </section>

    {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><X size={17} className="mt-0.5 shrink-0 text-red-700" /><div className="min-w-0 flex-1">{error}<button type="button" className="ml-3 font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black" onClick={() => void load().catch(() => undefined)}>Try again</button></div></div>}
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-[#d9e8a4] bg-[#f7fadf] px-4 py-3 text-sm text-neutral-800"><Check size={16} className="mt-0.5 shrink-0 text-[#53651a]" />{notice}</div>}

    <SectionCard title="Invite a team member" description="Send a secure activation link and assign only the access they need.">
      <form onSubmit={(event) => { event.preventDefault(); void request("/api/admin/users/invitations", "POST", { name, email, role }); }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_1fr_auto] xl:items-end">
        <label className="block text-sm font-medium text-neutral-800">Full name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="name" className="mt-2 block min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10" /></label>
        <label className="block text-sm font-medium text-neutral-800">Work email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" autoComplete="email" className="mt-2 block min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-black/10" /></label>
        <label className="block text-sm font-medium text-neutral-800">Access role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base outline-none transition focus:border-black focus:ring-2 focus:ring-black/10">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <button type="submit" disabled={busy || loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--brand-yellow)] px-5 py-3 text-sm font-semibold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-50 xl:min-w-44">{busy ? <RefreshCw size={15} className="animate-spin" /> : <MailPlus size={16} />}{busy ? "Sending…" : "Send invitation"}</button>
      </form>
      <p className="mt-4 flex items-start gap-2 border-t border-neutral-100 pt-4 text-xs leading-5 text-neutral-500"><KeyRound size={14} className="mt-0.5 shrink-0" />Invitation links expire in 48 hours. New administrators create their password from the secure link.</p>
    </SectionCard>

    <SectionCard title="Administrators" description="Role changes and session revocations take effect immediately.">
      {totalUsers > PAGE_SIZE && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f7f7f4] px-3 py-2.5 text-sm"><p className="text-neutral-600">Showing {pageIndex * PAGE_SIZE + 1}–{Math.min((pageIndex + 1) * PAGE_SIZE, totalUsers)} of {totalUsers} administrators</p><div className="flex gap-2"><button type="button" disabled={pageIndex === 0 || loading} onClick={() => setPageIndex((page) => Math.max(0, page - 1))} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-40">Previous</button><button type="button" disabled={(pageIndex + 1) * PAGE_SIZE >= totalUsers || loading} onClick={() => setPageIndex((page) => page + 1)} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-40">Next</button></div></div>}
      {loading && !loaded ? <div className="space-y-3 py-3" aria-label="Loading administrator accounts"><div className="h-10 animate-pulse rounded-lg bg-neutral-100" /><div className="h-14 animate-pulse rounded-lg bg-neutral-100" /><div className="h-14 animate-pulse rounded-lg bg-neutral-100" /></div> : users.length === 0 ? <div className="rounded-xl border border-dashed border-neutral-300 bg-[#fafaf8] px-6 py-12 text-center"><Users className="mx-auto text-neutral-400" size={24} /><p className="mt-3 text-sm font-medium">No administrator accounts yet</p><p className="mt-1 text-sm text-neutral-500">Send an invitation above to add your first team member.</p></div> : <>
        <div className="space-y-3 md:hidden">{users.map((user) => { const isSelf = user.id === actorId; return <article key={user.id} className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-neutral-900">{user.name || "Unnamed administrator"}</h3><p className="mt-1 break-all text-sm text-neutral-500">{user.email || "No email on file"}</p></div><StatusBadge tone={user.accountStatus === "ACTIVE" ? "yellow" : "neutral"}>{user.accountStatus.replaceAll("_", " ")}</StatusBadge></div>
          <p className="mt-3 text-xs text-neutral-500">{isSelf ? "You · your own access and sessions cannot be changed here." : "Manage this administrator’s role and active sessions."}</p>
          <label className="mt-4 block text-xs font-medium text-neutral-600">Access role<select aria-label={`Role for ${user.email || user.name}`} value={user.role} disabled={busy || isSelf} onChange={(event) => { const nextRole = event.target.value; if (confirm(`Change ${user.name || user.email}'s role to ${nextRole.replaceAll("_", " ")}? Their active sessions will be revoked.`)) void request(`/api/admin/users/${user.id}`, "PATCH", { role: nextRole }); else event.currentTarget.value = user.role; }} className="mt-1.5 min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 sm:text-sm disabled:opacity-50">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
          <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={busy || isSelf} className="min-h-11 rounded-lg border border-neutral-300 px-3 text-xs font-medium transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50" onClick={() => { const nextStatus = user.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE"; if (confirm(`${nextStatus === "SUSPENDED" ? "Suspend" : "Activate"} ${user.name || user.email}?`)) void request(`/api/admin/users/${user.id}`, "PATCH", { accountStatus: nextStatus }); }}>{user.accountStatus === "ACTIVE" ? "Suspend" : "Activate"}</button><button type="button" disabled={busy || isSelf} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-medium transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50" onClick={() => { if (confirm(`Sign ${user.name || user.email} out of all active sessions?`)) void request(`/api/admin/users/${user.id}/revoke-sessions`, "POST"); }}>Revoke sessions<ArrowUpRight size={13} /></button></div>
        </article>; })}</div>
        <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 md:block"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[#f2f4ec] text-[11px] uppercase tracking-[.1em] text-neutral-600"><tr><th scope="col" className="px-4 py-3 font-semibold">Administrator</th><th scope="col" className="px-4 py-3 font-semibold">Account</th><th scope="col" className="px-4 py-3 font-semibold">Role</th><th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead><tbody className="divide-y divide-neutral-100 bg-white">{users.map((user) => { const isSelf = user.id === actorId; return <tr key={user.id} className="align-middle transition-colors hover:bg-[#fcfcfa]"><td className="px-4 py-4"><p className="font-semibold text-neutral-900">{user.name || "Unnamed administrator"}{isSelf && <span className="ml-2 text-xs font-normal text-neutral-500">You</span>}</p><p className="mt-1 break-all text-xs text-neutral-500">{user.email || "No email on file"}</p></td><td className="px-4 py-4"><StatusBadge tone={user.accountStatus === "ACTIVE" ? "yellow" : "neutral"}>{user.accountStatus.replaceAll("_", " ")}</StatusBadge></td><td className="px-4 py-4"><select aria-label={`Role for ${user.email || user.name}`} value={user.role} disabled={busy || isSelf} onChange={(event) => { const nextRole = event.target.value; if (confirm(`Change ${user.name || user.email}'s role to ${nextRole.replaceAll("_", " ")}? Their active sessions will be revoked.`)) void request(`/api/admin/users/${user.id}`, "PATCH", { role: nextRole }); else event.currentTarget.value = user.role; }} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-black focus:ring-2 focus:ring-black/10 disabled:opacity-50">{roles.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></td><td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" disabled={busy || isSelf} className="min-h-10 rounded-lg border border-neutral-300 px-3 text-xs font-medium transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50" onClick={() => { const nextStatus = user.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE"; if (confirm(`${nextStatus === "SUSPENDED" ? "Suspend" : "Activate"} ${user.name || user.email}?`)) void request(`/api/admin/users/${user.id}`, "PATCH", { accountStatus: nextStatus }); }}>{user.accountStatus === "ACTIVE" ? "Suspend" : "Activate"}</button><button type="button" disabled={busy || isSelf} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-xs font-medium transition hover:border-neutral-500 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50" onClick={() => { if (confirm(`Sign ${user.name || user.email} out of all active sessions?`)) void request(`/api/admin/users/${user.id}/revoke-sessions`, "POST"); }}>Revoke sessions<ArrowUpRight size={13} /></button></div></td></tr>; })}</tbody></table></div>
      </>}
    </SectionCard>

    <SectionCard title="Invitations" description="Track pending, accepted, expired, and revoked access links.">
      {totalInvites > PAGE_SIZE && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#f7f7f4] px-3 py-2.5 text-sm"><p className="text-neutral-600">Showing {invitePageIndex * PAGE_SIZE + 1}–{Math.min((invitePageIndex + 1) * PAGE_SIZE, totalInvites)} of {totalInvites} invitations</p><div className="flex gap-2"><button type="button" disabled={invitePageIndex === 0 || loading} onClick={() => setInvitePageIndex((page) => Math.max(0, page - 1))} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-40">Previous</button><button type="button" disabled={(invitePageIndex + 1) * PAGE_SIZE >= totalInvites || loading} onClick={() => setInvitePageIndex((page) => page + 1)} className="min-h-10 rounded-lg border border-neutral-300 bg-white px-3 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black disabled:opacity-40">Next</button></div></div>}
      {loading && !loaded ? <div className="h-16 animate-pulse rounded-lg bg-neutral-100" aria-label="Loading invitations" /> : invites.length === 0 ? <p className="rounded-xl bg-[#fafaf8] px-4 py-8 text-center text-sm text-neutral-500">No invitations have been sent yet.</p> : <ul className="divide-y divide-neutral-100">{invites.map((invite) => { const status = invitationStatus(invite); return <li key={invite.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-900">{invite.name || invite.email}</p><p className="mt-1 break-all text-xs text-neutral-500">{invite.email} · {invite.role.replaceAll("_", " ")}</p></div><div className="flex items-center gap-3"><StatusBadge tone={status === "Pending" ? "yellow" : "neutral"}>{status}</StatusBadge>{status === "Pending" && <button type="button" disabled={busy} className="min-h-10 rounded-lg border border-neutral-300 px-3 text-xs font-medium transition hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-50" onClick={() => { if (confirm(`Revoke the invitation for ${invite.email}?`)) void request(`/api/admin/users/invitations/${invite.id}/revoke`, "POST"); }}>Revoke invitation</button>}</div></li>; })}</ul>}
    </SectionCard>
  </div>;
}
