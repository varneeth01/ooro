export const publicAccountTypes = ["BUSINESS", "BRAND", "AGENCY", "NETWORK", "EXPLORER"] as const;
export type PublicAccountType = typeof publicAccountTypes[number];
export function isPublicAccountType(value: string): value is PublicAccountType { return (publicAccountTypes as readonly string[]).includes(value); }
export function onboardingPath(accountType: PublicAccountType) { return `/onboarding/${accountType.toLowerCase()}`; }
