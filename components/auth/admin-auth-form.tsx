"use client";
import { FormEvent, useState } from "react";

export function AdminAuthForm() {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const payload = await response.json().catch(() => null); setBusy(false);
    if (!response.ok) { setError(payload?.error?.message || "Invalid email or password."); return; }
    window.location.href = new URLSearchParams(window.location.search).get("next") || "/admin";
  }
  return <form onSubmit={submit} className="space-y-5"><label className="block text-sm font-medium">Admin email<input required type="email" name="email" autoComplete="username" className="mt-2 block w-full rounded-[9px] border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"/></label><label className="block text-sm font-medium">Password<input required minLength={12} type="password" name="password" autoComplete="current-password" className="mt-2 block w-full rounded-[9px] border border-neutral-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"/></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} className="w-full rounded-[9px] bg-black px-4 py-3.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button><a href="/admin/reset-password" className="block text-center text-sm text-neutral-500 underline underline-offset-4">Forgot password?</a></form>;
}
