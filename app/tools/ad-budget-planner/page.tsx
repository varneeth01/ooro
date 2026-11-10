import type { Metadata } from "next";
import { PublicPage } from "@/components/marketing/public-page";
import { BudgetPlanner } from "@/components/seo/BudgetPlanner";
import { pageMetadata } from "@/lib/seo";
export const metadata: Metadata = pageMetadata("tools/ad-budget-planner", "Local Advertising Budget Planner", "Create a simple daily budget allocation for a local campaign. This educational planner makes no estimates of reach, inventory or results.");
export default function PlannerPage() { return <PublicPage eyebrow="OORO Tools / Planning" title="A budget plan, without made-up reach numbers." description="Enter your budget, campaign length and objective to create a simple planning note. The result is arithmetic only, not a media quote or performance estimate."><div className="container-ooro pb-20"><BudgetPlanner/><p className="mt-8 max-w-3xl text-sm leading-6 text-neutral-600">If you are considering OORO, our self-serve tool accepts budgets from ₹500. That is an input minimum in the planning flow, not an advertising rate or confirmation of availability. <a className="underline" href="/advertise">Review campaign planning</a>.</p></div></PublicPage>; }
