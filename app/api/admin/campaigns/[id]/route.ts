import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { AdminAuthError, getAuthenticatedAdmin } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";

export const dynamic = "force-dynamic";
const updateSchema = z.object({ status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"]).optional(), screenIds: z.array(z.string().uuid()).optional(), startDate: z.string().optional(), endDate: z.string().optional(), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), days: z.array(z.string()).optional(), timezone: z.string().optional(), frequency: z.enum(["LOW", "NORMAL", "HIGH", "PRIORITY"]).optional(), playsPerLoop: z.number().int().min(1).max(28).optional(), centerLat: z.number().finite().min(-90).max(90).optional(), centerLng: z.number().finite().min(-180).max(180).optional(), radiusKm: z.number().finite().positive().max(500).optional(), autoSelectRadius: z.boolean().optional(), playAsSoonAsSynced: z.boolean().optional(), offer: z.record(z.string(), z.string()).optional() });
const safe = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? Number(item) : item));
function errorResponse(error: unknown) { const status = error instanceof AdminAuthError ? error.status : 500; return NextResponse.json({ error: { message: status === 500 ? "Admin campaign service unavailable" : "Admin access required" } }, { status }); }
const campaignDate = (value: string | undefined, timezone: string, end = false) => { if (!value) return undefined; const suffix = timezone === "Asia/Kolkata" ? "+05:30" : "Z"; return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}${suffix}`); };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedAdmin();
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
                proofs: { where: { campaignId: id }, orderBy: { playbackStartedAt: "desc" }, take: 1, select: { playbackStartedAt: true, playbackEndedAt: true, actualDuration: true, status: true } },
              },
            },
          },
        },
      },
    });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    return NextResponse.json({ data: safe(campaign) });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAuthenticatedAdmin(); const { id } = await params; const parsed = updateSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: { message: "Invalid campaign update." } }, { status: 422 }); const input = parsed.data; const campaign = await webPrisma.campaign.findUnique({ where: { id } }); if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const current = (campaign.metadata && typeof campaign.metadata === "object" ? campaign.metadata : {}) as Record<string, unknown>; const currentSchedule = (current.adminSchedule && typeof current.adminSchedule === "object" ? current.adminSchedule : {}) as Record<string, unknown>; const requestedPlays = input.playsPerLoop ?? Number(currentSchedule.playsPerLoop ?? 1); const centerLat = input.centerLat ?? campaign.campaignCenterLat ?? undefined; const centerLng = input.centerLng ?? campaign.campaignCenterLng ?? undefined; const radiusKm = input.radiusKm ?? campaign.radiusKm ?? undefined; let requestedScreenIds = input.screenIds ? [...new Set(input.screenIds)] : undefined;
    if (input.autoSelectRadius && centerLat !== undefined && centerLng !== undefined && radiusKm !== undefined) { const displays = await webPrisma.display.findMany({ where: { lastLatitude: { not: null }, lastLongitude: { not: null }, state: { not: "DISABLED" } }, select: { id: true, lastLatitude: true, lastLongitude: true } }); const distance = (lat: number, lng: number) => { const radians = (value: number) => value * Math.PI / 180; const earth = 6371; const dLat = radians(lat - centerLat); const dLng = radians(lng - centerLng); const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(centerLat)) * Math.cos(radians(lat)) * Math.sin(dLng / 2) ** 2; return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }; requestedScreenIds = displays.filter(display => display.lastLatitude !== null && display.lastLongitude !== null && distance(display.lastLatitude, display.lastLongitude) <= radiusKm).map(display => display.id); }
    const metadata = { ...current, campaignType: "INTERNAL_TEST", playAsSoonAsSynced: input.playAsSoonAsSynced ?? current.playAsSoonAsSynced ?? false, offer: input.offer ?? current.offer ?? {}, adminSchedule: { ...currentSchedule, ...Object.fromEntries(Object.entries({ startTime: input.startTime, endTime: input.endTime, days: input.days, timezone: input.timezone, frequency: input.frequency, playsPerLoop: input.playsPerLoop }).filter(([, value]) => value !== undefined)), target: { mode: requestedScreenIds ? "MANUAL_SCREENS" : "RADIUS", centerLat, centerLng, radiusKm } } } as Prisma.InputJsonValue;
    if (input.status === "SCHEDULED" || input.status === "ACTIVE") { const creative = await webPrisma.creative.findFirst({ where: { campaignId: id, status: "ACTIVE", asset: { is: { active: true } } }, select: { id: true } }); if (!creative) return NextResponse.json({ error: { message: "Upload a creative before publishing." } }, { status: 422 }); }
    if (requestedScreenIds && (requestedPlays < 1 || requestedPlays > 28)) return NextResponse.json({ error: { message: "Frequency must use between 1 and 28 slot positions." } }, { status: 422 });
    if (requestedScreenIds && (input.status === "SCHEDULED" || input.status === "ACTIVE")) { const configs = await webPrisma.screenInventoryConfig.findMany({ where: { screenId: { in: requestedScreenIds } }, select: { screenId: true, commercialSlots: true, blockedSlots: true } }); const byScreen = new Map(configs.map(config => [config.screenId, config])); const conflicts = requestedScreenIds.filter(screenId => { const config = byScreen.get(screenId); const capacity = config ? Math.max(0, config.commercialSlots - config.blockedSlots) : 28; return requestedPlays > capacity; }); if (conflicts.length) return NextResponse.json({ error: { code: "SLOT_CAPACITY_CONFLICT", message: `${conflicts.length} selected screen${conflicts.length === 1 ? " does" : "s do"} not have sufficient slot capacity.`, conflictingScreenIds: conflicts } }, { status: 409 }); }
    const existingAssignments = await webPrisma.displayCampaignAssignment.findMany({ where: { campaignId: id, active: true }, select: { displayId: true } }); const commandIds = [...new Set(requestedScreenIds ?? existingAssignments.map(item => item.displayId))];
    const updated = await webPrisma.$transaction(async tx => { if (requestedScreenIds) { await tx.displayCampaignAssignment.updateMany({ where: { campaignId: id }, data: { active: false } }); const existing = await tx.displayCampaignAssignment.findMany({ where: { campaignId: id, displayId: { in: requestedScreenIds } }, select: { id: true, displayId: true } }); const existingByDisplay = new Map(existing.map(item => [item.displayId, item.id])); for (const displayId of requestedScreenIds) { const assignmentId = existingByDisplay.get(displayId); if (assignmentId) await tx.displayCampaignAssignment.update({ where: { id: assignmentId }, data: { active: true } }); else await tx.displayCampaignAssignment.create({ data: { campaignId: id, displayId, active: true } }); } } const result = await tx.campaign.update({ where: { id }, data: { status: input.status, campaignCenterLat: centerLat, campaignCenterLng: centerLng, radiusKm, timezone: input.timezone ?? undefined, startsAt: campaignDate(input.startDate, input.timezone ?? campaign.timezone ?? "UTC"), endsAt: campaignDate(input.endDate, input.timezone ?? campaign.timezone ?? "UTC", true), metadata } }); if (commandIds.length && input.status) { await tx.displayCommand.createMany({ data: commandIds.map(displayId => ({ displayId, commandType: "SYNC_MANIFEST", payload: { campaignId: id, status: input.status }, expiresAt: null })) }); } await tx.auditLog.create({ data: { actorRole: admin.role, action: input.status === "PAUSED" ? "CAMPAIGN_PAUSED" : input.status === "ACTIVE" || input.status === "SCHEDULED" ? "CAMPAIGN_PUBLISHED" : input.status === "COMPLETED" ? "CAMPAIGN_ENDED" : requestedScreenIds ? "SCREENS_ASSIGNED" : "CAMPAIGN_UPDATED", entityType: "Campaign", entityId: id, after: { status: input.status, screenCount: commandIds.length, campaignType: "INTERNAL_TEST" } } }); return result; });
    return NextResponse.json({ data: safe(updated) });
  } catch (error) { return errorResponse(error); }
}
