import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";

export async function currentOrganization() {
  const context = await webContext();
  if (!context?.organization) return null;
  return { ...context, organization: context.organization };
}

export async function verifiedOrganization(type: "BRAND" | "AGENCY") {
  const context = await currentOrganization();
  if (!context || context.organization.type !== type || context.organization.verificationStatus !== "VERIFIED") return null;
  if (type === "AGENCY") {
    const profile = await webPrisma.agencyProfile.findUnique({ where: { organizationId: context.organization.id } });
    if (!profile || !["APPROVED", "ACTIVE"].includes(profile.applicationStatus)) return null;
    return { ...context, profile };
  }
  return context;
}
