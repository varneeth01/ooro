import { AdminPasswordResetRequest, AdminPasswordSetForm } from "@/components/auth/admin-password-form";

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  const hasToken = token !== null;
  const validToken = token !== null && /^[A-Za-z0-9_-]{32,128}$/.test(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-6 py-12">
      <div className="w-full max-w-md">
        <p className="eyebrow text-neutral-500">OORO / Admin</p>
        <h1 className="display mt-4 text-5xl font-medium">
          {hasToken ? "Choose a new password." : "Reset password."}
        </h1>
        <p className="mt-5 text-sm leading-6 text-neutral-500">
          {hasToken
            ? "Enter a new password to finish resetting your admin account."
            : "Enter your admin email and we’ll send a one-time reset link."}
        </p>
        <div className="mt-10 border border-neutral-200 bg-white p-6 sm:p-8">
          {validToken ? (
            <AdminPasswordSetForm token={token} mode="reset" />
          ) : hasToken ? (
            <div className="space-y-4 text-sm">
              <p role="alert" className="text-red-700">This reset link is invalid. Please request a new one.</p>
              <a href="/admin/reset-password" className="font-medium text-black underline">Request a new reset link</a>
            </div>
          ) : (
            <AdminPasswordResetRequest />
          )}
        </div>
      </div>
    </main>
  );
}
