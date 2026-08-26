export function StatusDot({ label, muted = false }: { label?: string; muted?: boolean }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${muted ? "bg-neutral-400" : "bg-[var(--brand-yellow)]"}`} />{label && <span>{label}</span>}</span>;
}
