import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function PrivacyPage() { return <main className="p-10"><Link href="/">← OORO</Link><h1 className="mt-20 text-4xl">Privacy Policy</h1><p className="mt-4 text-neutral-500">A privacy policy will be added before launch.</p></main> }
