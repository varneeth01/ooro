import { Dashboard } from "@/components/app/dashboard";
import { redirect } from "next/navigation";
import { webContext } from "@/lib/web-owner";
import { PartnerDashboard } from "@/components/app/partner-dashboard";
export default async function DashboardPage() { const context = await webContext(); if (context && context.account.onboardingStatus !== "COMPLETED") redirect(`/onboarding/${context.account.accountType.toLowerCase()}`); if (context?.account.accountType === "NETWORK" || context?.account.accountType === "EXPLORER") return <PartnerDashboard accountType={context.account.accountType}/>; return <Dashboard/>; }
