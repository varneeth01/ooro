"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">OORO</p>
        <h1 className="mt-3 text-2xl font-semibold text-black">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">The page could not finish loading. Try again, or return to the dashboard.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white">Try again</button>
          <Link href="/" className="rounded-full border border-black/15 px-5 py-3 text-sm font-medium text-black">Go home</Link>
        </div>
      </section>
    </main>
  );
}
