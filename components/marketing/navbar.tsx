"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "../brand";

export function Navbar() {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const handleScroll = () => setScrolled(window.scrollY > 24); handleScroll(); window.addEventListener("scroll", handleScroll, { passive: true }); return () => window.removeEventListener("scroll", handleScroll); }, []);
  const links = [["How it works", "/how-it-works"], ["Solutions", "/#solutions"], ["Bengaluru", "/coverage"], ["For agencies", "/for-agencies"]];
  const close = () => setOpen(false);
  return <header id="top" className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled || open ? "border-b border-white/10 bg-black/75 backdrop-blur-xl" : "bg-transparent"}`}><div className="container-ooro flex items-center justify-between py-4 sm:py-5"><Brand dark/><nav className="hidden items-center gap-7 text-[13px] text-neutral-300 lg:flex">{links.map(([label, href]) => <Link className="focus-ring transition-colors hover:text-white" key={label} href={href}>{label}</Link>)}</nav><div className="hidden items-center gap-2 lg:flex"><Link className="focus-ring px-3 py-2 text-[13px] text-neutral-300 transition-colors hover:text-white" href="/login">Log in</Link><Link className="focus-ring rounded-xl bg-[var(--brand-yellow)] px-5 py-3 text-[13px] font-semibold text-black transition hover:-translate-y-px hover:brightness-95" href="/advertise">Plan a campaign</Link></div><button aria-label={open ? "Close menu" : "Open menu"} className="focus-ring text-white lg:hidden" onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>{open && <div className="container-ooro border-t border-white/10 pb-6 pt-5 md:hidden"><nav className="flex flex-col gap-5 text-sm text-neutral-300">{links.map(([label, href]) => <Link key={label} href={href} onClick={close}>{label}</Link>)}<div className="mt-2 flex items-center gap-5 border-t border-white/10 pt-5"><Link href="/login" onClick={close}>Log in</Link><Link className="rounded-lg bg-[var(--brand-yellow)] px-4 py-2 text-black" href="/advertise" onClick={close}>Plan a campaign</Link></div></nav></div>}</header>;
}
