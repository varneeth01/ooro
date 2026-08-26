import type { ReactNode } from "react";

export function ProductWindow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[10px] border border-neutral-300 bg-[#f1f1ee] ${className}`}><div className="flex h-10 items-center justify-between border-b border-neutral-300 px-4"><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-neutral-300"/><span className="h-1.5 w-1.5 rounded-full bg-neutral-300"/><span className="h-1.5 w-1.5 rounded-full bg-neutral-300"/></div><span className="font-mono text-[10px] tracking-[.14em] text-neutral-400">OORO / PRODUCT PREVIEW</span></div>{children}</div>;
}
