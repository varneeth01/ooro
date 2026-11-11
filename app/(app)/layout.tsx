import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
import { AppShell } from "@/components/app/app-shell";
import { webContext } from "@/lib/web-owner";
export default async function AppLayout({ children }: { children: React.ReactNode }) { const context = await webContext(); return <AppShell accountType={context?.account.accountType}>{children}</AppShell>; }
