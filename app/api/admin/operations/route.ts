import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";
import { finalizeSelfServePayment } from "@/lib/self-serve-payment";

export const dynamic = "force-dynamic";
const actionSchema = z.object({ orderNumber: z.string().min(1), action: z.enum(["RETRY_ALLOCATION", "MARK_REFUND_INITIATED", "MARK_REFUNDED", "RESOLVE"]), note: z.string().trim().max(1000).optional(), refundReference: z.string().trim().max(200).optional(), refundAmount: z.number().int().positive().optional() });
const exceptionStatuses = ["REFUND_REQUIRED", "ALLOCATION_FAILED", "PAYMENT_STATUS_MISMATCH", "PAYMENT_PENDING"];

function errorResponse(error: unknown) { const status = error instanceof AdminAuthError ? error.status : 500; return NextResponse.json({ error: { code: "ADMIN_OPERATIONS_ERROR", message: status === 500 ? "Unable to process payment exception" : "Admin access required" } }, { status }); }

export async function GET(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin(); const url = new URL(request.url); const filter = url.searchParams.get("filter") ?? "OPEN"; const query = url.searchParams.get("q")?.trim() ?? "";
    const orders = await webPrisma.guestCampaignOrder.findMany({ where: { status: { in: filter === "RESOLVED" ? [...exceptionStatuses, "PAID"] : exceptionStatuses }, ...(filter === "OPEN" ? { resolutionStatus: { notIn: ["RESOLVED", "REFUNDED"] } } : {}), ...(filter === "REFUND_REQUIRED" ? { status: "REFUND_REQUIRED" } : {}), ...(filter === "ALLOCATION_FAILED" ? { failureReason: { contains: "ALLOCATION" } } : {}), ...(filter === "RESOLVED" ? { resolutionStatus: { in: ["RESOLVED", "REFUNDED"] } } : {}), ...(query ? { OR: [{ publicOrderNumber: { contains: query, mode: "insensitive" } }, { campaignId: { contains: query, mode: "insensitive" } }, { customerEmail: { contains: query, mode: "insensitive" } }, { razorpayOrderId: { contains: query, mode: "insensitive" } }, { razorpayPaymentId: { contains: query, mode: "insensitive" } }] } : {}) }, orderBy: { updatedAt: "desc" }, take: 200 });
    return NextResponse.json({ data: orders.map(order => ({ orderNumber: order.publicOrderNumber, campaignId: order.campaignId, advertiser: order.businessName || order.customerEmail, amount: order.total, currency: order.currency, paymentId: order.razorpayPaymentId, razorpayOrderId: order.razorpayOrderId, holdId: order.holdId, status: order.status, failureType: order.failureReason, failureReason: order.failureReason, resolutionStatus: order.resolutionStatus, resolutionNote: order.resolutionNote, createdAt: order.createdAt, updatedAt: order.updatedAt, refundAmount: order.refundAmount, refundReference: order.refundReference, adminRole: admin.role })) });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAuthenticatedAdmin(); const parsed = actionSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_OPERATION", message: "Provide a valid operational action." } }, { status: 422 }); const input = parsed.data;
    const order = await webPrisma.guestCampaignOrder.findUnique({ where: { publicOrderNumber: input.orderNumber } }); if (!order) return NextResponse.json({ error: { message: "Payment exception not found" } }, { status: 404 });
    const actor = admin.role; const now = new Date();
    if (input.action === "RETRY_ALLOCATION") {
      if (!order.campaignId || !order.razorpayPaymentId) return NextResponse.json({ error: { message: "Verified payment and campaign are required before retrying allocation." } }, { status: 422 });
      await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "ALLOCATION_RETRY_STARTED", actor } });
      const result = await finalizeSelfServePayment(order.publicOrderNumber, order.razorpayPaymentId);
      if (result.state !== "RESERVED" && result.state !== "ALREADY_PROCESSED") { await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "ALLOCATION_RETRY_FAILED", actor, metadata: { state: result.state } } }); return NextResponse.json({ error: { message: "Allocation is still unavailable. The exception remains open." } }, { status: 409 }); }
      const updated = await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { resolutionStatus: "RESOLVED", resolvedAt: now, resolvedBy: actor, resolutionNote: input.note ?? "Allocation retry succeeded" } }); await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "ALLOCATION_RETRY_SUCCEEDED", actor, metadata: { note: input.note ?? null } } }); return NextResponse.json({ data: { status: updated.status, resolutionStatus: updated.resolutionStatus } });
    }
    if (input.action === "MARK_REFUND_INITIATED") {
      if (order.status !== "REFUND_REQUIRED") return NextResponse.json({ error: { message: "Only refund-required exceptions can be marked for refund." } }, { status: 422 }); const updated = await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { resolutionStatus: "REFUND_INITIATED", resolutionNote: input.note ?? "Manual refund initiated outside OORO" } }); await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "REFUND_MARKED_INITIATED", actor, metadata: { note: input.note ?? null } } }); return NextResponse.json({ data: { resolutionStatus: updated.resolutionStatus } });
    }
    if (input.action === "MARK_REFUNDED") {
      if (order.status !== "REFUND_REQUIRED" || !input.refundReference || !input.refundAmount || input.refundAmount > order.total) return NextResponse.json({ error: { message: "Provide a valid refund reference and an amount no greater than the verified payment." } }, { status: 422 }); const updated = await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { resolutionStatus: "REFUNDED", refundReference: input.refundReference, refundAmount: input.refundAmount, refundedAt: now, refundedBy: actor, resolvedAt: now, resolvedBy: actor, resolutionNote: input.note ?? "Manual refund recorded" } }); await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "REFUND_MARKED_COMPLETED", actor, metadata: { refundReference: input.refundReference, refundAmount: input.refundAmount } } }); return NextResponse.json({ data: { resolutionStatus: updated.resolutionStatus } });
    }
    const updated = await webPrisma.guestCampaignOrder.update({ where: { id: order.id }, data: { resolutionStatus: "RESOLVED", resolvedAt: now, resolvedBy: actor, resolutionNote: input.note ?? "Exception resolved" } }); await webPrisma.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "EXCEPTION_RESOLVED", actor, metadata: { note: input.note ?? null } } }); return NextResponse.json({ data: { resolutionStatus: updated.resolutionStatus } });
  } catch (error) { return errorResponse(error); }
}
