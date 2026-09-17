import { redirect } from "next/navigation";
import { webContext } from "@/lib/web-owner";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const context = await webContext();
  if (!context) redirect("/login");
  if (context.account.onboardingStatus !== "COMPLETED") {
    const kind = context.account.accountType.toLowerCase();
    const next = (await searchParams).next;
    redirect(`/onboarding/${kind}${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  }
  if (context.account.accountType === "AGENCY") redirect("/agency");
  if (context.account.accountType === "NETWORK") redirect("/network/status");
  if (context.account.accountType === "EXPLORER") redirect("/");
  if (context.account.accountType === "BRAND" && context.organization?.verificationStatus !== "VERIFIED") redirect("/verification");
  redirect("/dashboard");
}
