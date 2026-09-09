"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const [allowed, setAllowed] = useState<boolean | null>(null);
  const isLogin = pathname === "/admin/login";
  useEffect(() => { if (isLogin) { setAllowed(true); return; } let active = true; fetch("/api/auth/admin").then(response => response.ok).catch(() => false).then(ok => { if (!active) return; setAllowed(ok); if (!ok) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`); }); return () => { active = false; }; }, [isLogin, pathname, router]);
  if (isLogin) return <>{children}</>;
  if (allowed === null) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-neutral-500">Checking admin access…</div>;
  return allowed ? <>{children}</> : null;
}
