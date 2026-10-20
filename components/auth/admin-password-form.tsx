"use client";
import { FormEvent, useState } from "react";

export function AdminPasswordResetRequest() {
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const form = new FormData(event.currentTarget); await fetch("/api/auth/admin/request-password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) }); setBusy(false); setSent(true); }
  if (sent) return <p className="text-sm leading-6 text-neutral-600">If the account exists, password reset instructions have been sent.</p>;
  return <form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">Admin email<input required type="email" name="email" autoComplete="email" className="mt-2 block w-full rounded-[9px] border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"/></label><button disabled={busy} className="w-full rounded-[9px] bg-black px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}</button></form>;
}

export function AdminPasswordSetForm({ token, mode }: { token: string; mode: "setup" | "reset" }) {
  const [error, setError] = useState(""); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); const response = await fetch(`/api/auth/admin/${mode === "setup" ? "setup-password" : "reset-password"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: form.get("password") }) }); const payload = await response.json().catch(() => null); setBusy(false); if (!response.ok) { setError(payload?.error?.message || "This password link is invalid or expired."); return; } setDone(true); }
  if (done) return <div className="space-y-4 text-sm leading-6 text-neutral-600"><p>Your password has been set. You can now sign in.</p><a className="font-medium text-black underline" href="/admin/login">Go to admin sign in</a></div>;
  return <form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">New password<input required minLength={12} maxLength={128} type="password" name="password" autoComplete="new-password" className="mt-2 block w-full rounded-[9px] border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"/></label><p className="text-xs leading-5 text-neutral-500">Use at least 12 characters. This link can only be used once.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-[9px] bg-black px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving…" : mode === "setup" ? "Set password" : "Reset password"}</button></form>;
}
