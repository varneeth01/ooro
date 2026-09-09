import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify({ developmentAdminSeeded: false, reason: 'production' }))
    return
  }
  const adminPhone = process.env.DEV_ADMIN_PHONE ?? '+910000000001'
  const admin = await prisma.user.upsert({ where: { phone: adminPhone }, update: { role: 'SUPER_ADMIN', accountStatus: 'ACTIVE', name: 'OORO Development Admin' }, create: { phone: adminPhone, role: 'SUPER_ADMIN', accountStatus: 'ACTIVE', name: 'OORO Development Admin' } })
  const user = await prisma.user.upsert({ where: { phone: '+910000000002' }, update: { name: 'OORO Demo Driver', accountStatus: 'ACTIVE' }, create: { phone: '+910000000002', role: 'DRIVER', accountStatus: 'ACTIVE', name: 'OORO Demo Driver' } })
  const driver = await prisma.driver.upsert({ where: { userId: user.id }, update: { onboardingStatus: 'COMPLETE', city: 'Bengaluru' }, create: { userId: user.id, onboardingStatus: 'COMPLETE', city: 'Bengaluru' } })
  const vehicle = await prisma.vehicle.upsert({ where: { registrationNumber: 'TS09AB1234' }, update: { driverId: driver.id, status: 'VERIFIED' }, create: { driverId: driver.id, type: 'AUTO', registrationNumber: 'TS09AB1234', manufacturer: 'OORO', model: 'Demo Auto', status: 'VERIFIED' } })
  const display = await prisma.display.upsert({ where: { deviceId: 'OORO-DEMO' }, update: { vehicleId: vehicle.id, state: 'READY' }, create: { deviceId: 'OORO-DEMO', name: 'OORO Demo Display', vehicleId: vehicle.id, state: 'READY' } })
  if (process.env.NODE_ENV !== 'production' && process.env.OORO_SEED_CAMPAIGN === 'true') {
    const campaign = await prisma.campaign.upsert({ where: { id: '00000000-0000-0000-0000-000000000101' }, update: { status: 'ACTIVE', startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 30) }, create: { id: '00000000-0000-0000-0000-000000000101', name: 'OORO Development Campaign', status: 'ACTIVE', startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 30), priority: 10 } })
    const creative = await prisma.creative.upsert({ where: { id: '00000000-0000-0000-0000-000000000102' }, update: { campaignId: campaign.id, status: 'ACTIVE' }, create: { id: '00000000-0000-0000-0000-000000000102', campaignId: campaign.id, name: 'OORO Development Card', type: 'IMAGE', durationSeconds: 10, status: 'ACTIVE' } })
    await prisma.asset.upsert({ where: { creativeId: creative.id }, update: { url: process.env.OORO_DEV_ASSET_URL ?? 'http://localhost:3000/dev-assets/ooro-demo.svg', active: true }, create: { id: '00000000-0000-0000-0000-000000000103', creativeId: creative.id, url: process.env.OORO_DEV_ASSET_URL ?? 'http://localhost:3000/dev-assets/ooro-demo.svg', active: true } })
    await prisma.displayCampaignAssignment.upsert({ where: { displayId_campaignId: { displayId: display.id, campaignId: campaign.id } }, update: { active: true }, create: { displayId: display.id, campaignId: campaign.id, active: true } })
  }
  await prisma.mobilityIntegration.upsert({ where: { driverId_provider: { driverId: driver.id, provider: 'UBER' } }, update: { enabled: true, status: 'ACTIVE' }, create: { driverId: driver.id, provider: 'UBER', enabled: true, status: 'ACTIVE' } })
  for (const type of ['DRIVER_PARTNER', 'DISPLAY', 'LOCATION', 'NOTIFICATION_ACCESS', 'MOBILITY_DETECTION', 'PAYOUT', 'SAFETY', 'PRIVACY']) await prisma.agreementVersion.upsert({ where: { type_version: { type, version: '1.0' } }, update: {}, create: { type, version: '1.0', required: true } })
  console.log(JSON.stringify({ adminId: admin.id, driverId: driver.id, vehicleId: vehicle.id, displayId: display.id }))
}

main().finally(() => prisma.$disconnect())
