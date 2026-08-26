import Link from "next/link";

export function Brand({ dark = false }: { dark?: boolean }) {
  return <Link href="/" aria-label="OORO home" className={`focus-ring inline-flex items-center gap-2 font-bold tracking-[-.08em] text-[23px] ${dark ? "text-white" : "text-[#0A0A0A]"}`}><span className="inline-block h-2 w-2 rounded-full bg-[var(--brand-yellow)]" />OORO</Link>;
}
