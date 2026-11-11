import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Page() { return <main className="p-12"><h1>Access denied</h1><p>An authorized OORO administrator account is required.</p></main>; }
