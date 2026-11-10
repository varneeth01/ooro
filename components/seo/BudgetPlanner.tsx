"use client";
import { useState } from "react";

const objectives = ["Introduce a business", "Promote an offer", "Support local awareness", "Learn about a channel"];
export function BudgetPlanner() {
  const [industry, setIndustry] = useState("Restaurant or café");
  const [budget, setBudget] = useState("10000");
  const [days, setDays] = useState("14");
  const [objective, setObjective] = useState(objectives[0]);
  const amount = Math.max(0, Number(budget) || 0);
  const duration = Math.max(1, Number(days) || 1);
  return <section aria-labelledby="planner-title" className="mt-10 grid gap-8 border-y border-black/15 py-8 md:grid-cols-[1fr_1fr] md:gap-16">
    <div><h2 id="planner-title" className="text-2xl font-semibold tracking-tight">Make a simple planning outline</h2><p className="mt-3 max-w-prose text-sm leading-6 text-neutral-600">This educational tool only spreads a budget evenly across the days you enter. It does not estimate OORO inventory, impressions, reach, leads, rates or results.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Industry<select className="mt-2 block min-h-12 w-full rounded-lg border border-black/15 bg-white px-3" value={industry} onChange={e => setIndustry(e.target.value)}>{["Restaurant or café", "Retail", "Fitness", "Education", "Healthcare", "Other"].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-medium">Objective<select className="mt-2 block min-h-12 w-full rounded-lg border border-black/15 bg-white px-3" value={objective} onChange={e => setObjective(e.target.value)}>{objectives.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="text-sm font-medium">Total budget (₹)<input type="number" min="0" step="500" className="mt-2 block min-h-12 w-full rounded-lg border border-black/15 bg-white px-3" value={budget} onChange={e => setBudget(e.target.value)} /></label>
        <label className="text-sm font-medium">Duration (days)<input type="number" min="1" max="365" className="mt-2 block min-h-12 w-full rounded-lg border border-black/15 bg-white px-3" value={days} onChange={e => setDays(e.target.value)} /></label>
      </div>
    </div>
    <div aria-live="polite" className="self-center rounded-xl bg-[#101210] p-6 text-white md:p-8"><p className="text-xs font-semibold uppercase tracking-[.15em] text-[#dfff00]">Your planning note</p><h3 className="mt-4 text-xl font-semibold">{industry}: {objective.toLowerCase()}</h3><p className="mt-3 text-sm leading-6 text-neutral-300">If allocated evenly, ₹{Math.round(amount / duration).toLocaleString("en-IN")} per day across {duration} days uses a total budget of ₹{Math.round(amount).toLocaleString("en-IN")}.</p><p className="mt-4 border-t border-white/15 pt-4 text-xs leading-5 text-neutral-400">This is arithmetic, not a quote or recommendation. Ask each provider about costs, placement, eligibility, availability and evidence. OORO confirms campaign inventory and terms separately.</p></div>
  </section>;
}
