import { createHmac, timingSafeEqual } from "node:crypto";

const keyId = () => process.env.RAZORPAY_KEY_ID ?? "";
const keySecret = () => process.env.RAZORPAY_KEY_SECRET ?? "";

export async function createPublicRazorpayOrder(receipt: string, amount: number, notes: Record<string, string>) {
  if (!keyId() || !keySecret()) throw new Error("PAYMENT_PROVIDER_NOT_CONFIGURED");
  if (keyId().startsWith("rzp_live_") && process.env.NODE_ENV !== "production" && process.env.ALLOW_LIVE_RAZORPAY_IN_DEVELOPMENT !== "true") throw new Error("LIVE_PAYMENT_KEYS_NOT_ALLOWED_IN_DEVELOPMENT");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amount * 100, currency: "INR", receipt, notes }),
  });
  if (!response.ok) throw new Error("PAYMENT_PROVIDER_UNAVAILABLE");
  return await response.json() as { id: string; amount: number; currency: string };
}

export function verifyPublicCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const secret = keySecret();
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

export const publicRazorpayKeyId = keyId;
