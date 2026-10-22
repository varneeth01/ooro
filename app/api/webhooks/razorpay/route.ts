import { paymentRetiredResponse } from "@/lib/payment-retired";
export const runtime = "nodejs";
export async function POST() { return paymentRetiredResponse(); }

