import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { verifiedOrganization } from "@/lib/organization-access";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) { const context = await verifiedOrganization("AGENCY"); if (!context) return NextResponse.json({ error: { message: "Agency approval is required" } }, { status: 403 }); const { id } = await params; const client = await webPrisma.agencyClient.findFirst({ where: { id, agencyOrganizationId: context.organization.id } }); if (!client) return NextResponse.json({ error: { message: "Client not found" } }, { status: 404 }); const campaigns = await webPrisma.campaign.findMany({ where: { agencyOrganizationId: context.organization.id, agencyClientId: id }, orderBy: { updatedAt: "desc" } }); return NextResponse.json({ data: { client, campaigns } }); }
