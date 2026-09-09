import { AdminAuthForm } from "@/components/auth/admin-auth-form";

export default function AdminLoginPage() { return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-12"><div className="w-full max-w-md"><p className="eyebrow text-neutral-500">OORO / Admin</p><h1 className="display mt-4 text-5xl font-medium">Admin access.</h1><p className="mt-5 text-sm leading-6 text-neutral-500">Authenticate with your OORO admin phone and one-time password.</p><div className="mt-10 border border-neutral-200 bg-white p-6 sm:p-8"><AdminAuthForm/></div></div></main>; }
