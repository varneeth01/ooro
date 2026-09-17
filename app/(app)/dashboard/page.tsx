import { Dashboard } from "@/components/app/dashboard";
import { redirect } from "next/navigation";
import { webContext } from "@/lib/web-owner";
export default async function DashboardPage() { const context = await webContext(); if (context && context.account.onboardingStatus !== "COMPLETED") redirect(`/onboarding/${context.account.accountType.toLowerCase()}`); return <Dashboard/>; }
