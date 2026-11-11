const steps = [
  ["01", "Shape the campaign", "Choose Bengaluru areas, dates and budget. Explore the options in OORO’s campaign planner."],
  ["02", "Share your creative", "Upload an image or video for review before a campaign is scheduled."],
  ["03", "Confirm the details", "OORO checks eligible inventory and confirms the campaign details before booking."],
  ["04", "Review what played", "Where supported, review proof-of-play for scheduled creative delivery."],
] as const;

export function CampaignPlanning() {
  return <section id="campaign-process" className="cinematic-section" aria-labelledby="planning-title"><div className="cinematic-wrap">
    <div className="scene-heading" data-reveal><span className="scene-no">04 / ADVERTISING</span><div><p className="field-label">From a brief to a real campaign</p><h2 id="planning-title">Clear steps.<br /><span>Confirmed details.</span></h2><p className="mt-6">Plan in the existing campaign flow. Eligible inventory and campaign details are confirmed before booking.</p></div></div>
    <div className="campaign-journey">{steps.map(([number, title, copy]) => <article key={number} className="campaign-step grid gap-3 sm:grid-cols-[80px_1fr_1fr] sm:items-start" data-reveal><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
  </div></section>;
}
