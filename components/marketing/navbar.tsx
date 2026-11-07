"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "../brand";

const links = [["How it works", "/#experience"], ["Why OORO", "/#features"], ["Who it is for", "/#solutions"], ["Coverage", "/coverage"]] as const;

export function Navbar() {
  const rootRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduced = useReducedMotion();
  const pathname = usePathname();

  const closeMenu = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => menuRef.current?.focus());
  }, []);

  useEffect(() => {
    const change = () => setScrolled(window.scrollY > 34);
    change();
    window.addEventListener("scroll", change, { passive: true });
    return () => window.removeEventListener("scroll", change);
  }, []);

  useEffect(() => { closeMenu(); }, [pathname, closeMenu]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => navRef.current?.querySelector<HTMLElement>("a")?.focus());
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeMenu(true); return; }
      if (event.key !== "Tab") return;
      const items = Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) closeMenu();
    };
    window.addEventListener("keydown", trapFocus);
    document.addEventListener("pointerdown", closeOutside, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", trapFocus);
      document.removeEventListener("pointerdown", closeOutside, true);
    };
  }, [open, closeMenu]);

  return <header ref={rootRef} id="top" className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#090b0b]/95 text-white supports-[backdrop-filter]:bg-[#090b0b]/90 supports-[backdrop-filter]:backdrop-blur-md">
    <motion.div layout={!reduced} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 280, damping: 30 }} className={`container-ooro flex items-center justify-between ${scrolled ? "py-1" : "py-2"}`}>
      <Brand dark />
      <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setHovered(null)}>
        {links.map(([label, href]) => <Link key={href} href={href} onMouseEnter={() => setHovered(href)} className="relative isolate rounded-full px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">
          {hovered === href && !reduced && <motion.span layoutId="nav-pill" transition={{ type: "spring", stiffness: 390, damping: 32 }} className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-white/15" />}
          {label}
        </Link>)}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <Link href="/login" className="px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#dfff00]">Log in</Link>
        <Link href="/advertise" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#dfff00] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">Plan a campaign <ArrowUpRight size={15} /></Link>
      </div>
      <button ref={menuRef} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="ooro-mobile-nav" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00] lg:hidden" onClick={() => open ? closeMenu(true) : setOpen(true)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    </motion.div>
    <AnimatePresence initial={false}>{open && <motion.nav ref={navRef} id="ooro-mobile-nav" aria-label="Mobile navigation" initial={reduced ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={reduced ? { duration: 0 } : { duration: .18 }} className="border-t border-white/10 bg-[#0c0f0e] px-5 py-4 text-white shadow-2xl lg:hidden">
      {links.map(([label, href]) => <Link key={href} href={href} onClick={() => closeMenu()} className="block min-h-12 border-b border-white/10 px-1 py-3 text-base font-medium hover:text-[#dfff00] focus-visible:outline-2 focus-visible:outline-[#dfff00]">{label}</Link>)}
      <div className="mt-4 grid grid-cols-2 gap-3"><Link onClick={() => closeMenu()} href="/login" className="rounded-lg border border-white/20 px-4 py-3 text-center text-base focus-visible:outline-2 focus-visible:outline-[#dfff00]">Log in</Link><Link onClick={() => closeMenu()} href="/advertise" className="rounded-lg bg-[#dfff00] px-4 py-3 text-center text-base font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">Plan campaign</Link></div>
    </motion.nav>}</AnimatePresence>
  </header>;
}
