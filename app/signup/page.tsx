import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function SignupPage() { return <AuthLayout mode="signup"><AuthForm mode="signup"/></AuthLayout> }
