import { NextResponse } from "next/server";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";

export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    await getAuthenticatedAdmin(); const { orderNumber } = await params; const order = await webPrisma.guestCampaignOrder.findUnique({ where: { publicOrderNumber: orderNumber } }); if (!order) return NextResponse.json({ error: { message: "Payment exception not found" } }, { status: 404 });
    const [campaign, allocations, events] = await Promise.all([order.campaignId ? webPrisma.campaign.findUnique({ where: { id: order.campaignId }, select: { id: true, name: true, status: true, metadata: true, pricingSnapshot: true, forecastSnapshot: true, forecastVersion: true, acceptedForecastVersion: true, acceptedForecastAt: true, startsAt: true, endsAt: true, radiusKm: true, campaignCenterLat: true, campaignCenterLng: true } }) : null, order.campaignId ? webPrisma.inventoryAllocation.findMany({ where: { campaignId: order.campaignId }, orderBy: [{ date: "asc" }, { slot: "asc" }], select: { id: true, screenId: true, date: true, slot: true, status: true, holdId: true, expiresAt: true } }) : [], webPrisma.selfServePaymentEvent.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } })]);
    return NextResponse.json({ data: { order: { orderNumber: order.publicOrderNumber, advertiser: order.businessName || order.customerEmail, customerEmail: order.customerEmail, total: order.total, currency: order.currency, status: order.status, razorpayOrderId: order.razorpayOrderId, paymentId: order.razorpayPaymentId, holdId: order.holdId, failureReason: order.failureReason, resolutionStatus: order.resolutionStatus, resolutionNote: order.resolutionNote, refundAmount: order.refundAmount, refundReference: order.refundReference, createdAt: order.createdAt, updatedAt: order.updatedAt }, campaign, allocations, events } });
  } catch (error) { const status = error instanceof AdminAuthError ? error.status : 500; return NextResponse.json({ error: { message: status === 500 ? "Unable to load exception" : "Admin access required" } }, { status }); }
}
