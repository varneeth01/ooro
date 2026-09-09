import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-black">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">That OORO page does not exist or has moved.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-medium text-white">Go home</Link>
      </section>
    </main>
  );
}
