export type ContentFaqItem = { question: string; answer: string };

export function ContentFaq({ items, title = "Common questions" }: { items: ContentFaqItem[]; title?: string }) {
  return <section aria-label={title} className="container-ooro max-w-5xl py-12 sm:py-16">
    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    <div className="mt-5 divide-y divide-black/15 border-y border-black/15">
      {items.map(item => <article key={item.question} className="py-6">
        <h3 className="text-lg font-semibold">{item.question}</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-700">{item.answer}</p>
      </article>)}
    </div>
  </section>;
}
