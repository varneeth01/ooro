import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { publicCampaignPackageFor } from "@/lib/public-campaign-packages";
import { connectPublicMongo, publicMongoError, PublicCampaignOrderModel } from "@/lib/public-campaign-orders";
import { createPublicRazorpayOrder, publicRazorpayErrorCode, publicRazorpayKeyId } from "@/lib/public-razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  name: z.string().trim().min(2).max(120), businessName: z.string().trim().min(2).max(160),
  phone: z.string().trim().regex(/^(?:\+91[- ]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email().max(254), packageId: z.string().min(1), city: z.string().trim().min(2).max(100),
  campaignNotes: z.string().trim().max(2000).optional(),
});

const orderId = () => `OORO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
const errorResponse = (code: string, message: string, status: number) => NextResponse.json({ data: null, error: { code, message } }, { status });

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("VALIDATION_ERROR", parsed.error.issues.map((issue) => issue.message).join("; "), 422);
  const input = parsed.data;
  const selected = publicCampaignPackageFor(input.packageId);
  if (!selected || input.city.toLowerCase() !== selected.city.toLowerCase()) return errorResponse("INVALID_PACKAGE", "This campaign package is unavailable for the selected city", 422);
  const normalizedPhone = input.phone.replace(/[ -]/g, "").replace(/^\+91/, "+91");
  const id = orderId();
  try {
    await connectPublicMongo();
    const saved = await PublicCampaignOrderModel.create({ orderId: id, brandName: input.businessName, contactName: input.name, phone: normalizedPhone, email: input.email.toLowerCase(), packageId: selected.id, packageName: selected.name, city: input.city, campaignNotes: input.campaignNotes, amount: selected.amount, currency: selected.currency, paymentStatus: "PENDING" });
    try {
      const razorpay = await createPublicRazorpayOrder(id, selected.amount, { publicOrderId: id, packageId: selected.id });
      await PublicCampaignOrderModel.updateOne({ _id: saved._id }, { $set: { razorpayOrderId: razorpay.id } });
      return NextResponse.json({ data: { orderId: id, razorpayOrderId: razorpay.id, keyId: publicRazorpayKeyId(), amount: razorpay.amount, currency: razorpay.currency, name: input.name, email: input.email.toLowerCase(), phone: normalizedPhone }, error: null });
    } catch (error) {
      await PublicCampaignOrderModel.updateOne({ _id: saved._id }, { $set: { paymentStatus: "FAILED" } });
      const code = publicRazorpayErrorCode(error);
      const message = code === "RAZORPAY_MODE_NOT_CONFIGURED" ? "Razorpay mode is not configured" : code === "RAZORPAY_KEY_MODE_MISMATCH" ? "Razorpay key does not match configured mode" : code === "PAYMENT_PROVIDER_NOT_CONFIGURED" ? "Payment setup is temporarily unavailable" : "Payment provider is temporarily unavailable";
      return errorResponse(code, message, 503);
    }
  } catch (error) {
    console.error("Public campaign order persistence failed", error instanceof Error ? error.name : "unknown");
    return errorResponse("GUEST_STORE_UNAVAILABLE", publicMongoError(error) ? "Checkout storage is temporarily unavailable" : "Could not create checkout order", 503);
  }
}
