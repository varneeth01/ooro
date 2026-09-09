export type PublicCampaignPackage = {
  id: string;
  name: string;
  city: "Tirupati";
  durationDays: 30;
  autos: number;
  hoursPerDay: 4 | 8;
  amount: number;
  currency: "INR";
  active: true;
  displayOrder: number;
};

// This is intentionally a database-free source of truth for public checkout.
// Prices match the currently published OORO launch packages.
export const publicCampaignPackages: PublicCampaignPackage[] = [
  [5, 4, 3000], [10, 4, 6000], [15, 4, 9000], [25, 4, 15000],
  [5, 8, 5000], [10, 8, 10000], [15, 8, 15000], [25, 8, 25000],
].map(([autos, hoursPerDay, amount], index) => ({
  id: `TPT_30D_${hoursPerDay}H_${autos}`,
  name: `Tirupati · ${autos} autos · ${hoursPerDay} hours/day · 30 days`,
  city: "Tirupati",
  durationDays: 30,
  autos,
  hoursPerDay: hoursPerDay as 4 | 8,
  amount,
  currency: "INR",
  active: true,
  displayOrder: index + 1,
}));

export const publicCampaignPackageFor = (id: string) =>
  publicCampaignPackages.find((item) => item.id === id && item.active);
