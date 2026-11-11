const benefits = [
  ["01", "A different kind of attention", "Meet passengers in a real-world setting, beyond the usual scroll."],
  ["02", "Planned around place", "Start with Bengaluru neighborhoods that matter to your business, subject to availability."],
  ["03", "People behind the process", "A team reviews creative and confirms eligible inventory before campaigns are booked."],
] as const;

export function AdvertiserBenefits() {
  return <section id="features" className="cinematic-section alt" aria-labelledby="benefits-title"><div className="cinematic-wrap">
    <div className="scene-heading" data-reveal><span className="scene-no">A / WHY OORO</span><div><p className="field-label">Media with a local point of view</p><h2 id="benefits-title">Show up where<br /><span>the city happens.</span></h2></div></div>
    <div className="benefit-list">{benefits.map(([number, title, copy]) => <article key={number} data-reveal><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
  </div></section>;
}
