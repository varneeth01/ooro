export type PricingAccessContext = { organizationType?: string | null; verificationStatus?: string | null; agencyApplicationStatus?: string | null };
export function canAccessPricing(context: PricingAccessContext, customerType: string) {
  if (customerType === "SELF_SERVE") return true;
  if (customerType === "BRAND") return context.organizationType === "BRAND" && context.verificationStatus === "VERIFIED";
  if (customerType === "AGENCY") return context.organizationType === "AGENCY" && context.verificationStatus === "VERIFIED" && ["APPROVED", "ACTIVE"].includes(context.agencyApplicationStatus ?? "");
  return false;
}
