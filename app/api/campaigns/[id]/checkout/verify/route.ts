import { NextResponse } from "next/server";
import { z } from "zod";
import { webOwnerEmail } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { verifyPublicCheckoutSignature } from "@/lib/public-razorpay";
import { finalizeSelfServePayment } from "@/lib/self-serve-payment";
import { POST as createHold } from "../../hold/route";
const schema = z.object({ orderId: z.string().min(1), razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) });
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in to verify payment" } }, { status: 401 }); const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyPublicCheckoutSignature(parsed.success ? parsed.data.razorpayOrderId : "", parsed.success ? parsed.data.razorpayPaymentId : "", parsed.success ? parsed.data.razorpaySignature : "")) return NextResponse.json({ error: { code: "INVALID_PAYMENT_SIGNATURE", message: "Payment could not be verified" } }, { status: 400 });
  const input = parsed.data;
  try {
    let order = await webPrisma.guestCampaignOrder.findFirst({ where: { publicOrderNumber: input.orderId, razorpayOrderId: input.razorpayOrderId, campaignId: id, ownerEmail } }); if (!order) return NextResponse.json({ error: { code: "PAYMENT_ORDER_NOT_FOUND", message: "Payment order does not belong to this campaign." } }, { status: 404 });
    if (order.status === "PAID" || order.status === "CAMPAIGN_PENDING_REVIEW") return NextResponse.json({ data: { status: order.status, campaignId: id, orderId: order.publicOrderNumber } });
    // Reuse an active hold or reacquire once if payment raced its expiry.
    const holdResponse = await createHold(request, { params: Promise.resolve({ id }) }); const holdBody = await holdResponse.json();
    if (!holdResponse.ok || !holdBody.data?.holdId) { await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { status: "REFUND_REQUIRED", razorpayPaymentId: input.razorpayPaymentId, paymentCapturedAt: new Date(), paymentProcessedAt: new Date(), failureReason: "ALLOCATION_FAILED_AFTER_PAYMENT" } }); return NextResponse.json({ error: { code: "REFUND_REQUIRED", message: "Payment received, but campaign inventory could not be confirmed. OORO support will resolve this." }, data: { status: "REFUND_REQUIRED", campaignId: id, orderId: order.publicOrderNumber } }, { status: 409 }); }
    order = await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { holdId: holdBody.data.holdId } }); const result = await finalizeSelfServePayment(order.publicOrderNumber, input.razorpayPaymentId);
    if (result.state === "RESERVED" || result.state === "ALREADY_PROCESSED") return NextResponse.json({ data: { status: "CAMPAIGN_PENDING_REVIEW", campaignId: id, orderId: order.publicOrderNumber } });
    return NextResponse.json({ error: { code: "REFUND_REQUIRED", message: "Payment received, but campaign inventory could not be confirmed. OORO support will resolve this." }, data: { status: "REFUND_REQUIRED", campaignId: id, orderId: order.publicOrderNumber } }, { status: 409 });
  } catch { return NextResponse.json({ error: { code: "PAYMENT_PROCESSING_ERROR", message: "Payment received. We are confirming your campaign inventory." } }, { status: 409 }); }
}
