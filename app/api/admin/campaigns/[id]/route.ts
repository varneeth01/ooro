import { canAdmin } from "@/apps/api/src/domain/admin-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AdminAuthError, getAuthenticatedAdmin, requireAdminPermission } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";
import { safeDestination } from "@/apps/api/src/domain/qr-destination";
import { getDisplayConnectivity } from "@/apps/api/src/domain/display-health";

export const dynamic = "force-dynamic";
const offerSchema = z.object({ brandName: z.string().trim().max(120).optional(), offerTitle: z.string().trim().max(160).optional(), offerSubtitle: z.string().trim().max(240).optional(), offerValue: z.string().trim().max(120).optional(), ctaType: z.string().trim().max(40).optional(), ctaLabel: z.string().trim().max(80).optional(), ctaUrl: z.string().trim().max(2048).optional() }).strict();
const updateSchema = z.object({ status: z.enum(["DRAFT", "APPROVED", "REJECTED", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"]).optional(), screenIds: z.array(z.string().uuid()).max(1000).optional(), startDate: z.string().optional(), endDate: z.string().optional(), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), days: z.array(z.string()).max(7).optional(), timezone: z.string().max(64).optional(), frequency: z.enum(["LOW", "NORMAL", "HIGH", "PRIORITY"]).optional(), playsPerLoop: z.number().int().min(1).max(28).optional(), centerLat: z.number().finite().min(-90).max(90).optional(), centerLng: z.number().finite().min(-180).max(180).optional(), radiusKm: z.number().finite().positive().max(500).optional(), autoSelectRadius: z.boolean().optional(), playAsSoonAsSynced: z.boolean().optional(), offer: offerSchema.optional() });
const safe = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? Number(item) : item));
function errorResponse(error: unknown) { const status = error instanceof AdminAuthError ? error.status : 500; return NextResponse.json({ error: { message: status === 500 ? "Admin campaign service unavailable" : "Admin access required" } }, { status }); }
const campaignDate = (value: string | undefined, timezone: string, end = false) => { if (!value) return undefined; const suffix = timezone === "Asia/Kolkata" ? "+05:30" : "Z"; return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}${suffix}`); };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!canAdmin(admin.role, "campaign:read")) throw new AdminAuthError("ADMIN_ACCESS_DENIED", 403);
    const { id } = await params;
    const campaign = await webPrisma.campaign.findUnique({
      where: { id },
      include: {
        creatives: { include: { asset: true }, orderBy: { displayOrder: "asc" } },
        assignments: {
          where: { active: true },
          include: {
            display: {
              select: {
                id: true, name: true, state: true, manifestVersion: true, lastHeartbeatAt: true,
                currentCampaignId: true, currentCreativeId: true, currentPlaybackState: true,
                commands: { where: { commandType: { in: ["SYNC_MANIFEST", "REFRESH_MANIFEST"] }, payload: { path: ["campaignId"], equals: id } }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true, createdAt: true, deliveredAt: true, acknowledgedAt: true, error: true } },
                proofs: { where: { campaignId: id }, orderBy: { playbackStartedAt: "desc" }, take: 1, select: { playbackStartedAt: true, playbackEndedAt: true, actualDuration: true, status: true } },
              },
            },
          },
        },
      },
    });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const [completedPlays, qrScans] = await Promise.all([
      webPrisma.proofOfPlay.count({ where: { campaignId: id, playbackCompleted: true } }),
      webPrisma.qrScan.count({ where: { campaignId: id } }),
    ]);
    const assignments = campaign.assignments.map(assignment => ({ ...assignment, display: { ...assignment.display, connectivity: getDisplayConnectivity(assignment.display.lastHeartbeatAt ?? undefined) } }));
    return NextResponse.json({ data: safe({ ...campaign, assignments, analytics: { completedPlays, qrScans, scanRate: completedPlays === 0 ? null : (qrScans / completedPlays) * 100 } }) });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminPermission("campaign:update"); const { id } = await params; const parsed = updateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: { message: "Invalid campaign update." } }, { status: 422 }); const input = parsed.data;
    if (input.status === "APPROVED") await requireAdminPermission("campaign:approve");
    if (input.status === "SCHEDULED" || input.status === "ACTIVE") await requireAdminPermission("campaign:schedule");
    const campaign = await webPrisma.campaign.findUnique({ where: { id } }); if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (input.status === "ACTIVE" || input.status === "SCHEDULED") return NextResponse.json({error:{code:"USE_SCHEDULER",message:"Publish through Admin → Scheduler to validate and reserve inventory."}},{status:409});
    const existingSchedule = await webPrisma.adSchedule.findUnique({where:{campaignId:id}});
    if (existingSchedule && (input.screenIds || input.startDate || input.endDate || input.startTime || input.endTime || input.days || input.playsPerLoop || input.autoSelectRadius)) return NextResponse.json({error:{code:"USE_SCHEDULER",message:"Edit delivery dates, targeting and playback rules in Admin → Scheduler."}},{status:409});
    const current = (campaign.metadata && typeof campaign.metadata === "object" ? campaign.metadata : {}) as Record<string, unknown>; const currentSchedule = (current.adminSchedule && typeof current.adminSchedule === "object" ? current.adminSchedule : {}) as Record<string, unknown>; const requestedPlays = input.playsPerLoop ?? Number(currentSchedule.playsPerLoop ?? 1); const centerLat = input.centerLat ?? campaign.campaignCenterLat ?? undefined; const centerLng = input.centerLng ?? campaign.campaignCenterLng ?? undefined; const radiusKm = input.radiusKm ?? campaign.radiusKm ?? undefined; let requestedScreenIds = input.screenIds ? [...new Set(input.screenIds)] : undefined;
    if (input.offer?.ctaUrl && !safeDestination(input.offer.ctaUrl, false)) return NextResponse.json({ error: { code: "UNSAFE_QR_DESTINATION", message: "QR destination must use HTTPS." } }, { status: 422 });
    if (input.autoSelectRadius && centerLat !== undefined && centerLng !== undefined && radiusKm !== undefined) { const displays = await webPrisma.display.findMany({ where: { lastLatitude: { not: null }, lastLongitude: { not: null }, state: { not: "DISABLED" } }, select: { id: true, lastLatitude: true, lastLongitude: true } }); const distance = (lat: number, lng: number) => { const radians = (value: number) => value * Math.PI / 180; const earth = 6371; const dLat = radians(lat - centerLat); const dLng = radians(lng - centerLng); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(centerLat)) * Math.cos(radians(lat)) * Math.sin(dLng / 2) ** 2; return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }; requestedScreenIds = displays.filter(display => display.lastLatitude !== null && display.lastLongitude !== null && distance(display.lastLatitude, display.lastLongitude) <= radiusKm).map(display => display.id); }
    const metadata = { ...current, playAsSoonAsSynced: input.playAsSoonAsSynced ?? current.playAsSoonAsSynced ?? false, offer: input.offer ?? current.offer ?? {}, adminSchedule: { ...currentSchedule, ...Object.fromEntries(Object.entries({ startTime: input.startTime, endTime: input.endTime, days: input.days, timezone: input.timezone, frequency: input.frequency, playsPerLoop: input.playsPerLoop }).filter(([, value]) => value !== undefined)), target: { mode: requestedScreenIds ? "MANUAL_SCREENS" : "RADIUS", centerLat, centerLng, radiusKm } } } as Prisma.InputJsonValue;
    if (requestedScreenIds) { const eligibleDisplays = await webPrisma.display.count({ where: { id: { in: requestedScreenIds }, state: { not: "DISABLED" } } }); if (eligibleDisplays !== requestedScreenIds.length) return NextResponse.json({ error: { code: "DISPLAY_NOT_ELIGIBLE", message: "One or more selected screens are unavailable." } }, { status: 422 }); }
    if (requestedScreenIds && (requestedPlays < 1 || requestedPlays > 28)) return NextResponse.json({ error: { message: "Frequency must use between 1 and 28 slot positions." } }, { status: 422 });
    const existingAssignments = await webPrisma.displayCampaignAssignment.findMany({ where: { campaignId: id, active: true }, select: { displayId: true } }); const commandIds = [...new Set([...(requestedScreenIds ?? []), ...existingAssignments.map(item => item.displayId)])];
    const updated = await webPrisma.$transaction(async tx => { if (requestedScreenIds) { await tx.displayCampaignAssignment.updateMany({ where: { campaignId: id }, data: { active: false } }); const existing = await tx.displayCampaignAssignment.findMany({ where: { campaignId: id, displayId: { in: requestedScreenIds } }, select: { id: true, displayId: true } }); const existingByDisplay = new Map(existing.map(item => [item.displayId, item.id])); for (const displayId of requestedScreenIds) { const assignmentId = existingByDisplay.get(displayId); if (assignmentId) await tx.displayCampaignAssignment.update({ where: { id: assignmentId }, data: { active: true } }); else await tx.displayCampaignAssignment.create({ data: { campaignId: id, displayId, active: true } }); } } const result = await tx.campaign.update({ where: { id }, data: { status: input.status, campaignCenterLat: centerLat, campaignCenterLng: centerLng, radiusKm, timezone: input.timezone ?? undefined, startsAt: campaignDate(input.startDate, input.timezone ?? campaign.timezone ?? "UTC"), endsAt: campaignDate(input.endDate, input.timezone ?? campaign.timezone ?? "UTC", true), metadata } }); if(input.status === "PAUSED") await tx.adSchedule.updateMany({where:{campaignId:id},data:{status:"PAUSED"}}); if(input.status === "COMPLETED"){const schedules=await tx.adSchedule.findMany({where:{campaignId:id},select:{id:true}});await tx.adSchedule.updateMany({where:{campaignId:id},data:{status:"COMPLETED"}});await tx.inventoryAllocation.updateMany({where:{scheduleId:{in:schedules.map(schedule=>schedule.id)},status:{in:["RESERVED","ACTIVE"]}},data:{status:"CANCELLED"}});await tx.displayCampaignAssignment.updateMany({where:{campaignId:id},data:{active:false}});} if (commandIds.length) { await tx.displayCommand.createMany({ data: commandIds.map(displayId => ({ displayId, commandType: "SYNC_MANIFEST", payload: { campaignId: id, status: input.status }, expiresAt: null })) }); } await tx.auditLog.create({ data: { actorId: admin.userId, actorRole: admin.role, action: input.status === "PAUSED" ? "CAMPAIGN_PAUSED" : input.status === "APPROVED" ? "CAMPAIGN_APPROVED" : input.status === "COMPLETED" ? "CAMPAIGN_ENDED" : requestedScreenIds ? "SCREENS_ASSIGNED" : "CAMPAIGN_UPDATED", entityType: "Campaign", entityId: id, before: {status:campaign.status}, after: { status: input.status, screenCount: commandIds.length } } }); return result; });
    return NextResponse.json({ data: safe({ ...updated, syncRequested: commandIds.length, commandType: commandIds.length && input.status ? "SYNC_MANIFEST" : null }) });
  } catch (error) { return errorResponse(error); }
}
