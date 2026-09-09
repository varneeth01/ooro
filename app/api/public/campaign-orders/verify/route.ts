import { NextResponse } from "next/server";
import { z } from "zod";
import { connectPublicMongo, PublicCampaignOrderModel } from "@/lib/public-campaign-orders";
import { verifyPublicCheckoutSignature } from "@/lib/public-razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ orderId: z.string(), razorpayOrderId: z.string(), razorpayPaymentId: z.string(), razorpaySignature: z.string() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyPublicCheckoutSignature(parsed.success ? parsed.data.razorpayOrderId : "", parsed.success ? parsed.data.razorpayPaymentId : "", parsed.success ? parsed.data.razorpaySignature : "")) return NextResponse.json({ data: null, error: { code: "INVALID_PAYMENT_SIGNATURE", message: "Payment could not be verified" } }, { status: 400 });
  try {
    await connectPublicMongo();
    const order = await PublicCampaignOrderModel.findOne({ orderId: parsed.data.orderId, razorpayOrderId: parsed.data.razorpayOrderId });
    if (!order) return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Order not found" } }, { status: 404 });
    if (order.paymentStatus !== "PAID") { order.paymentStatus = "PAID"; order.paymentId = parsed.data.razorpayPaymentId; order.razorpayPaymentId = parsed.data.razorpayPaymentId; order.paidAt = new Date(); await order.save(); }
    return NextResponse.json({ data: { orderId: order.orderId, status: order.paymentStatus }, error: null });
  } catch { return NextResponse.json({ data: null, error: { code: "GUEST_STORE_UNAVAILABLE", message: "Checkout storage is temporarily unavailable" } }, { status: 503 }); }
}
