import { AdminAuthForm } from "@/components/auth/admin-auth-form";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
 try { await getAuthenticatedAdmin({ refreshSession: false }); redirect("/admin"); }
 catch (error) { if (!(error instanceof AdminAuthError)) throw error; }
 return <main className="admin-login flex min-h-screen items-center justify-center px-6 py-12"><div className="w-full max-w-md"><p className="eyebrow text-[#dfff00]">OORO / Admin</p><h1 className="display mt-4 text-5xl font-medium">Admin access.</h1><p className="mt-5 text-sm leading-6 text-neutral-400">Sign in with your OORO admin email and password.</p><div className="admin-login-card mt-10 rounded-2xl border p-6 sm:p-8"><AdminAuthForm/></div></div></main>; }
