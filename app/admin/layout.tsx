import { AdminGuard } from "@/components/admin/admin-guard";
import { AppShell } from "@/components/app/app-shell";
export default function AdminLayout({ children }: { children: React.ReactNode }) { return <AdminGuard><AppShell variant="admin">{children}</AppShell></AdminGuard>; }
