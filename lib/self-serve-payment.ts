import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { webPrisma } from "@/lib/web-prisma";
import { dateKeys, slotCandidates } from "@/apps/api/src/domain/inventory";

async function reallocateAfterHoldExpiry(tx: Prisma.TransactionClient, campaignId: string, tier: "STANDARD" | "PREMIUM_PLUS", holdId: string, expiresAt: Date) {
  const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, include: { assignments: { where: { active: true }, select: { displayId: true } } } });
  if (!campaign?.startsAt || !campaign.endsAt || !campaign.assignments.length) return 0;
  const dates = dateKeys(campaign.startsAt, campaign.endsAt);
  let created = 0;
  for (const assignment of campaign.assignments) {
    const config = await tx.screenInventoryConfig.upsert({ where: { screenId: assignment.displayId }, update: {}, create: { screenId: assignment.displayId } });
    for (const date of dates) {
      const occupied = await tx.inventoryAllocation.findMany({ where: { screenId: assignment.displayId, date: new Date(`${date}T00:00:00.000Z`), status: { in: ["HELD", "RESERVED", "ACTIVE", "BLOCKED"] } }, select: { slot: true } });
      const slot = slotCandidates(Math.min(config.totalSlots, config.commercialSlots + config.houseSlots + config.blockedSlots), config.premiumSlots, tier).find(candidate => candidate < config.commercialSlots && !occupied.some(item => item.slot === candidate));
      if (slot === undefined) throw new Error("ALLOCATION_CAPACITY_EXCEEDED");
      await tx.inventoryAllocation.create({ data: { campaignId, screenId: assignment.displayId, date: new Date(`${date}T00:00:00.000Z`), slot, holdId, expiresAt, status: "HELD", rate: campaign.effectiveRate, pricingSource: campaign.pricingSource ?? tier } });
      created += 1;
    }
  }
  return created;
}

export async function finalizeSelfServePayment(orderNumber: string, paymentId: string) {
  return webPrisma.$transaction(async tx => {
    const order = await tx.guestCampaignOrder.findUnique({ where: { publicOrderNumber: orderNumber } });
    if (!order) return { state: "NOT_FOUND" as const };
    if (order.status === "PAID" || order.status === "PAYMENT_VERIFIED" || order.status === "CAMPAIGN_PENDING_REVIEW") { console.warn("DUPLICATE_PAYMENT_CALLBACK", { orderNumber, paymentId }); return { state: "ALREADY_PROCESSED" as const, order, campaignStatus: "CAMPAIGN_PENDING_REVIEW" }; }
    const now = new Date();
    await tx.inventoryAllocation.updateMany({ where: { status: "HELD", expiresAt: { lt: now } }, data: { status: "CANCELLED", expiresAt: null } });
    const campaign = order.campaignId ? await tx.campaign.findUnique({ where: { id: order.campaignId }, select: { deliveryTier: true } }) : null;
    if (order.holdId?.startsWith("planned-")) {
      const paid = await tx.guestCampaignOrder.update({ where: { id: order.id }, data: { status: "PAID", razorpayPaymentId: paymentId, paymentCapturedAt: now, paymentProcessedAt: now, failureReason: null } });
      if (order.campaignId) await tx.campaign.update({ where: { id: order.campaignId }, data: { status: "CAMPAIGN_PENDING_REVIEW" } });
      await tx.selfServePaymentEvent.createMany({ data: [{ orderId: order.id, campaignId: order.campaignId, eventType: "PAYMENT_VERIFIED", metadata: { paymentId } }, { orderId: order.id, campaignId: order.campaignId, eventType: "PLANNED_DELIVERY_COMMITTED", metadata: { target: "forecastSnapshot", allocationMode: "PLANNED_DELIVERY_COMMITMENT" } }] });
      return { state: "RESERVED" as const, order: paid, campaignStatus: "CAMPAIGN_PENDING_REVIEW" };
    }
    const allocations = order.holdId ? await tx.inventoryAllocation.findMany({ where: { campaignId: order.campaignId ?? undefined, holdId: order.holdId, status: "HELD", expiresAt: { gt: now } }, select: { id: true } }) : [];
    if (!allocations.length && order.campaignId) {
      const replacementHoldId = randomUUID();
      try {
        const holdMinutes = (await tx.forecastSetting.findUnique({ where: { key: "DEFAULT" }, select: { inventoryHoldMinutes: true } }))?.inventoryHoldMinutes ?? 15;
        await reallocateAfterHoldExpiry(tx, order.campaignId, campaign?.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD", replacementHoldId, new Date(now.getTime() + holdMinutes * 60_000));
        const reacquired = await tx.inventoryAllocation.findMany({ where: { campaignId: order.campaignId, holdId: replacementHoldId, status: "HELD" }, select: { id: true } });
        allocations.push(...reacquired);
        if (reacquired.length && replacementHoldId !== order.holdId) await tx.guestCampaignOrder.update({ where: { id: order.id }, data: { holdId: replacementHoldId } });
      } catch { /* the payment is retained in an explicit refund-required state below */ }
    }
    if (!allocations.length) {
      const failed = await tx.guestCampaignOrder.update({ where: { id: order.id }, data: { status: "REFUND_REQUIRED", razorpayPaymentId: paymentId, paymentCapturedAt: now, paymentProcessedAt: now, failureReason: "HOLD_EXPIRED_OR_MISSING" } });
      if (order.campaignId) await tx.campaign.update({ where: { id: order.campaignId }, data: { status: "ALLOCATION_FAILED" } });
      await tx.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: "ALLOCATION_FAILED", metadata: { reason: "HOLD_EXPIRED_OR_MISSING" } } });
      console.warn("PAYMENT_SUCCESS_ALLOCATION_FAILED", { orderNumber, campaignId: order.campaignId, paymentId });
      return { state: "REFUND_REQUIRED" as const, order: failed };
    }
    await tx.inventoryAllocation.updateMany({ where: { id: { in: allocations.map(item => item.id) }, status: "HELD" }, data: { status: "RESERVED", expiresAt: null } });
    const paid = await tx.guestCampaignOrder.update({ where: { id: order.id }, data: { status: "PAID", razorpayPaymentId: paymentId, paymentCapturedAt: now, paymentProcessedAt: now, failureReason: null } });
    if (order.campaignId) await tx.campaign.update({ where: { id: order.campaignId }, data: { status: "CAMPAIGN_PENDING_REVIEW" } });
    await tx.selfServePaymentEvent.createMany({ data: [{ orderId: order.id, campaignId: order.campaignId, eventType: "PAYMENT_VERIFIED", metadata: { paymentId } }, { orderId: order.id, campaignId: order.campaignId, eventType: "HOLD_CONVERTED_TO_RESERVED", metadata: { allocationCount: allocations.length } }] });
    console.info("HOLD_CONVERTED_TO_RESERVED", { orderNumber, campaignId: order.campaignId, holdId: order.holdId });
    return { state: "RESERVED" as const, order: paid, campaignStatus: "CAMPAIGN_PENDING_REVIEW" };
  });
}

export async function failSelfServePayment(orderNumber: string, reason = "PAYMENT_FAILED") {
  return webPrisma.$transaction(async tx => {
    const order = await tx.guestCampaignOrder.findUnique({ where: { publicOrderNumber: orderNumber } });
    if (!order || order.status === "PAID" || order.status === "CAMPAIGN_PENDING_REVIEW") return order;
    if (order.campaignId && order.holdId) await tx.inventoryAllocation.updateMany({ where: { campaignId: order.campaignId, holdId: order.holdId, status: "HELD" }, data: { status: "CANCELLED", expiresAt: null } });
    const updated = await tx.guestCampaignOrder.update({ where: { id: order.id }, data: { status: reason === "PAYMENT_EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED", failureReason: reason, paymentProcessedAt: new Date() } });
    await tx.selfServePaymentEvent.create({ data: { orderId: order.id, campaignId: order.campaignId, eventType: reason === "PAYMENT_EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED", metadata: { reason } } });
    return updated;
  });
}
