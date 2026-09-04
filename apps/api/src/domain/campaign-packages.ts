export type CampaignPackage = { id: string; city: 'Tirupati'; durationDays: 30; autos: number; hoursPerDay: 4 | 8; amount: number; currency: 'INR'; active: boolean; displayOrder: number }
export const campaignPackages: CampaignPackage[] = [
  { id: 'TPT_30D_4H_5', city: 'Tirupati', durationDays: 30, autos: 5, hoursPerDay: 4, amount: 3000, currency: 'INR', active: true, displayOrder: 1 },
  { id: 'TPT_30D_4H_10', city: 'Tirupati', durationDays: 30, autos: 10, hoursPerDay: 4, amount: 6000, currency: 'INR', active: true, displayOrder: 2 },
  { id: 'TPT_30D_4H_15', city: 'Tirupati', durationDays: 30, autos: 15, hoursPerDay: 4, amount: 9000, currency: 'INR', active: true, displayOrder: 3 },
  { id: 'TPT_30D_4H_25', city: 'Tirupati', durationDays: 30, autos: 25, hoursPerDay: 4, amount: 15000, currency: 'INR', active: true, displayOrder: 4 },
  { id: 'TPT_30D_8H_5', city: 'Tirupati', durationDays: 30, autos: 5, hoursPerDay: 8, amount: 5000, currency: 'INR', active: true, displayOrder: 5 },
  { id: 'TPT_30D_8H_10', city: 'Tirupati', durationDays: 30, autos: 10, hoursPerDay: 8, amount: 10000, currency: 'INR', active: true, displayOrder: 6 },
  { id: 'TPT_30D_8H_15', city: 'Tirupati', durationDays: 30, autos: 15, hoursPerDay: 8, amount: 15000, currency: 'INR', active: true, displayOrder: 7 },
  { id: 'TPT_30D_8H_25', city: 'Tirupati', durationDays: 30, autos: 25, hoursPerDay: 8, amount: 25000, currency: 'INR', active: true, displayOrder: 8 },
]
export const packageFor = (id: string) => campaignPackages.find((item) => item.id === id && item.active)
