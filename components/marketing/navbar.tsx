"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "../brand";

const links = [["Bengaluru advertising", "/digital-advertising-bengaluru"], ["How it works", "/how-it-works"], ["For brands", "/for-brands"], ["Guides", "/guides"], ["Coverage", "/coverage"]] as const;

export function Navbar() {
  const rootRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    <div className={`container-ooro flex items-center justify-between transition-[padding] duration-200 motion-reduce:transition-none ${scrolled ? "py-1" : "py-2"}`}>
      <Brand dark />
      <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
        {links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`rounded-full px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00] motion-reduce:transition-none ${pathname === href ? "text-white" : "text-neutral-300"}`}>
          {label}
        </Link>)}
      </nav>
      <div className="hidden items-center gap-3 lg:flex">
        <Link href="/login" className="px-4 py-2.5 text-[13px] font-medium text-neutral-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#dfff00]">Log in</Link>
        <Link href="/advertise" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#dfff00] px-5 py-2.5 text-[13px] font-semibold text-black transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">Plan a campaign <ArrowUpRight size={15} /></Link>
      </div>
      <button ref={menuRef} type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="ooro-mobile-nav" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00] lg:hidden" onClick={() => open ? closeMenu(true) : setOpen(true)}>{open ? <X size={21} /> : <Menu size={21} />}</button>
    </div>
    {open && <nav ref={navRef} id="ooro-mobile-nav" aria-label="Mobile navigation" className="ooro-menu-enter border-t border-white/10 bg-[#0c0f0e] px-5 py-4 text-white shadow-2xl lg:hidden">
      {links.map(([label, href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} onClick={() => closeMenu(true)} className={`block min-h-12 border-b border-white/10 px-1 py-3 text-base font-medium hover:text-[#dfff00] focus-visible:outline-2 focus-visible:outline-[#dfff00] ${pathname === href ? "text-[#dfff00]" : "text-white"}`}>{label}</Link>)}
      <div className="mt-4 grid grid-cols-2 gap-3"><Link onClick={() => closeMenu(true)} href="/login" className="min-h-12 rounded-lg border border-white/20 px-4 py-3 text-center text-base focus-visible:outline-2 focus-visible:outline-[#dfff00]">Log in</Link><Link onClick={() => closeMenu(true)} href="/advertise" className="min-h-12 rounded-lg bg-[#dfff00] px-4 py-3 text-center text-base font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dfff00]">Plan campaign</Link></div>
    </nav>}
  </header>;
}
