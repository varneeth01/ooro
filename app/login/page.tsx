import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";
import { webOwnerEmail } from "@/lib/web-owner";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await webOwnerEmail()) redirect("/dashboard");
  return <AuthLayout mode="login"><AuthForm mode="login"/></AuthLayout>;
}
