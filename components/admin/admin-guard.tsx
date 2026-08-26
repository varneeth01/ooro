"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessAdmin, getCurrentUser } from "@/lib/admin/authorization";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { const ok = canAccessAdmin(getCurrentUser()); setAllowed(ok); if (!ok) router.replace(`/login?next=${encodeURIComponent(pathname)}`); }, [pathname, router]);
  if (allowed === null) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-neutral-500">Checking admin access…</div>;
  return allowed ? <>{children}</> : null;
}
