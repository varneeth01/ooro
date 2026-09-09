import { createHmac, timingSafeEqual } from "node:crypto";

type RazorpayMode = "test" | "live";
type RazorpayConfig = { mode: RazorpayMode; keyId: string; keySecret: string };

export function publicRazorpayConfig(): RazorpayConfig {
  const mode = process.env.RAZORPAY_MODE?.trim().toLowerCase();
  if (mode !== "test" && mode !== "live") throw new Error("RAZORPAY_MODE_NOT_CONFIGURED");
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
  if ((mode === "live" && !keyId.startsWith("rzp_live_")) || (mode === "test" && !keyId.startsWith("rzp_test_"))) throw new Error("RAZORPAY_KEY_MODE_MISMATCH");
  return { mode, keyId, keySecret };
}

export function assertPublicRazorpayKeyAllowed() {
  publicRazorpayConfig();
}

export async function createPublicRazorpayOrder(receipt: string, amount: number, notes: Record<string, string>) {
  const config = publicRazorpayConfig();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes }),
  });
  if (!response.ok) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
  return await response.json() as { id: string; amount: number; currency: string };
}

export function verifyPublicCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function verifyPublicWebhookSignature(raw: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const publicRazorpayKeyId = () => publicRazorpayConfig().keyId;

export function publicRazorpayErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  return ["RAZORPAY_MODE_NOT_CONFIGURED", "RAZORPAY_KEY_MODE_MISMATCH", "PAYMENT_PROVIDER_NOT_CONFIGURED", "PAYMENT_PROVIDER_UNAVAILABLE"].includes(code) ? code : "PAYMENT_PROVIDER_UNAVAILABLE";
}
