"use client";

import Link from "next/link";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

export function MagneticLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  const move = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / bounds.width;
    const y = (event.clientY - bounds.top - bounds.height / 2) / bounds.height;
    event.currentTarget.style.setProperty("--mag-x", `${(x * 7).toFixed(1)}px`);
    event.currentTarget.style.setProperty("--mag-y", `${(y * 5).toFixed(1)}px`);
  };
  const reset = (event: PointerEvent<HTMLAnchorElement>) => {
    event.currentTarget.style.setProperty("--mag-x", "0px");
    event.currentTarget.style.setProperty("--mag-y", "0px");
  };
  const style = { "--mag-x": "0px", "--mag-y": "0px" } as CSSProperties;
  return <Link href={href} onPointerMove={move} onPointerLeave={reset} className={`magnetic-target ${className}`} style={style}>{children}</Link>;
}
