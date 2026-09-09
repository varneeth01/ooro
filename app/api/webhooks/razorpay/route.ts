import { NextResponse } from "next/server";
import { connectPublicMongo, PublicCampaignOrderModel } from "@/lib/public-campaign-orders";
import { verifyPublicWebhookSignature } from "@/lib/public-razorpay";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPublicWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "")) return NextResponse.json({ error: { code: "INVALID_WEBHOOK_SIGNATURE", message: "Webhook signature could not be verified" } }, { status: 400 });
  const payload = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  const payment = payload.payload?.payment?.entity;
  if (payment?.order_id && (payload.event === "payment.captured" || payload.event === "order.paid")) { await connectPublicMongo(); await PublicCampaignOrderModel.findOneAndUpdate({ razorpayOrderId: payment.order_id }, { $set: { paymentStatus: "PAID", paymentId: payment.id, razorpayPaymentId: payment.id, paidAt: new Date() } }); }
  if (payment?.order_id && payload.event === "payment.failed") { await connectPublicMongo(); await PublicCampaignOrderModel.findOneAndUpdate({ razorpayOrderId: payment.order_id, paymentStatus: { $ne: "PAID" } }, { $set: { paymentStatus: "FAILED" } }); }
  return NextResponse.json({ data: { received: true }, error: null });
}
